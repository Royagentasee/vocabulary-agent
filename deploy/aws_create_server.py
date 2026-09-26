"""在 AWS 上一键创建服务器（EC2 + 密钥 + 安全组 + 弹性 IP）

用法（PowerShell）:

  $env:AWS_ACCESS_KEY_ID     = "你的 Access Key ID"
  $env:AWS_SECRET_ACCESS_KEY = "你的 Secret Access Key"
  $env:AWS_REGION            = "ap-east-1"        # 香港，默认值
  $env:AWS_INSTANCE_TYPE     = "t3.medium"        # 默认 2核4G
  python deploy\\aws_create_server.py

脚本会自动：
  1. 创建密钥对，把 .pem 保存到 E:\\aws\\vocab-agent-key.pem
  2. 创建安全组（开放 22 / 80 / 443）
  3. 找到最新的 Ubuntu 24.04 镜像并启动实例
  4. 申请弹性 IP 并绑定（IP 固定不变）
  5. 输公网 IP，供后续 provision_new_server.py 部署
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

REGION = os.environ.get('AWS_REGION', 'ap-east-1')          # 香港
INSTANCE_TYPE = os.environ.get('AWS_INSTANCE_TYPE', 't3.medium')
KEY_NAME = os.environ.get('AWS_KEY_NAME', 'vocab-agent-key')
SG_NAME = os.environ.get('AWS_SG_NAME', 'vocab-agent-sg')
KEY_DIR = Path(os.environ.get('AWS_KEY_DIR', r'E:\aws'))
KEY_PATH = KEY_DIR / f'{KEY_NAME}.pem'
DISK_GB = int(os.environ.get('AWS_DISK_GB', '30'))


def log(m: str) -> None:
    print(m, flush=True)


def main() -> int:
    if not os.environ.get('AWS_ACCESS_KEY_ID') or not os.environ.get('AWS_SECRET_ACCESS_KEY'):
        log('请先设置 AWS_ACCESS_KEY_ID 和 AWS_SECRET_ACCESS_KEY 环境变量')
        return 1

    ec2 = boto3.client('ec2', region_name=REGION)
    log(f'=== 区域: {REGION} | 机型: {INSTANCE_TYPE} | 磁盘: {DISK_GB}GB ===')

    # ---------- 1. 密钥对 ----------
    KEY_DIR.mkdir(parents=True, exist_ok=True)
    try:
        ec2.describe_key_pairs(KeyNames=[KEY_NAME])
        log(f'密钥对 {KEY_NAME} 已存在，跳过创建')
        if not KEY_PATH.exists():
            log(f'  [警告] 但本地没有 {KEY_PATH}，如果实例用旧密钥你将无法登录')
    except ClientError:
        log(f'创建密钥对 {KEY_NAME} ...')
        kp = ec2.create_key_pair(KeyName=KEY_NAME)
        KEY_PATH.write_text(kp['KeyMaterial'], encoding='utf-8')
        try:
            os.chmod(KEY_PATH, 0o600)
        except OSError:
            pass
        log(f'  私钥已保存到: {KEY_PATH}')

    # ---------- 2. 安全组 ----------
    vpcs = ec2.describe_vpcs(Filters=[{'Name': 'isDefault', 'Values': ['true']}])['Vpcs']
    if not vpcs:
        log('找不到默认 VPC，请先在 AWS 控制台创建默认 VPC')
        return 1
    vpc_id = vpcs[0]['VpcId']

    try:
        sg = ec2.describe_security_groups(GroupNames=[SG_NAME])['SecurityGroups'][0]
        sg_id = sg['GroupId']
        log(f'安全组已存在: {sg_id}')
    except ClientError:
        log('创建安全组 ...')
        sg_id = ec2.create_security_group(
            GroupName=SG_NAME, Description='Vocabulary Agent web + ssh', VpcId=vpc_id
        )['GroupId']
        for port, desc in [(22, 'SSH'), (80, 'HTTP'), (443, 'HTTPS')]:
            ec2.authorize_security_group_ingress(
                GroupId=sg_id,
                IpPermissions=[{
                    'IpProtocol': 'tcp', 'FromPort': port, 'ToPort': port,
                    'IpRanges': [{'CidrIp': '0.0.0.0/0', 'Description': desc}],
                }],
            )
        log(f'  已开放 22 / 80 / 443 -> {sg_id}')

    # ---------- 3. 找 Ubuntu 24.04 镜像 ----------
    log('查找 Ubuntu 24.04 镜像 ...')
    images = ec2.describe_images(
        Owners=['099720109477'],   # Canonical
        Filters=[
            {'Name': 'name', 'Values': ['ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*']},
            {'Name': 'state', 'Values': ['available']},
            {'Name': 'architecture', 'Values': ['x86_64']},
        ],
    )['Images']
    if not images:
        log('找不到 Ubuntu 24.04 镜像')
        return 1
    ami = sorted(images, key=lambda i: i['CreationDate'])[-1]
    log(f'  {ami["ImageId"]}  ({ami["Name"]})')

    # ---------- 4. 启动实例 ----------
    log('启动实例（约 30-60 秒）...')
    res = ec2.run_instances(
        ImageId=ami['ImageId'],
        InstanceType=INSTANCE_TYPE,
        KeyName=KEY_NAME,
        MinCount=1, MaxCount=1,
        SecurityGroupIds=[sg_id],
        BlockDeviceMappings=[{
            'DeviceName': '/dev/sda1',
            'Ebs': {'VolumeSize': DISK_GB, 'VolumeType': 'gp3', 'DeleteOnTermination': True},
        }],
        TagSpecifications=[{
            'ResourceType': 'instance',
            'Tags': [{'Key': 'Name', 'Value': 'vocab-agent'}],
        }],
    )
    instance_id = res['Instances'][0]['InstanceId']
    log(f'  实例 ID: {instance_id}')

    waiter = ec2.get_waiter('instance_running')
    waiter.wait(InstanceIds=[instance_id], WaiterConfig={'Delay': 5, 'MaxAttempts': 60})
    log('  实例已运行')

    # ---------- 5. 弹性 IP ----------
    log('申请并绑定弹性 IP ...')
    try:
        addr = ec2.allocate_address(Domain='vpc')
        alloc_id = addr['AllocationId']
        public_ip = addr['PublicIp']
        ec2.associate_address(InstanceId=instance_id, AllocationId=alloc_id)
        log(f'  弹性 IP: {public_ip}（已绑定）')
    except ClientError as e:
        log(f'  [警告] 弹性 IP 申请失败：{e}')
        ec2.get_waiter('instance_running').wait(InstanceIds=[instance_id])
        inst = ec2.describe_instances(InstanceIds=[instance_id])['Reservations'][0]['Instances'][0]
        public_ip = inst.get('PublicIpAddress', '')
        log(f'  改用实例自带公网 IP: {public_ip}')

    log('\n' + '=' * 60)
    log('服务器创建完成！')
    log(f'  公网 IP : {public_ip}')
    log(f'  密钥文件: {KEY_PATH}')
    log(f'  用户名  : ubuntu')
    log('=' * 60)
    log('\n下一步执行部署（会自动把项目 + 数据库搬过去）：')
    log(f'  $env:VOCAB_NEW_HOST="{public_ip}"')
    log(f'  $env:VOCAB_NEW_USER="ubuntu"')
    log(f'  $env:VOCAB_NEW_KEY="{KEY_PATH}"')
    log('  $env:VOCAB_SSH_PASSWORD="当前腾讯云服务器密码"   # 用于搬运数据库')
    log('  python deploy\\provision_new_server.py')
    return 0


if __name__ == '__main__':
    sys.exit(main())
