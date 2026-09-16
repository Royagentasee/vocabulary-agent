# 下载 ECDICT

在 PowerShell 中执行（**必须你自己跑**，sandbox 不让模型启动子进程）：

```powershell
cd C:\AppSoft\vocabularyagent
python tools\seed-data\download-simple.py
```

## 预期输出

```
下载: https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv
下载完成: 90.x MB
```

## 如果下载慢

可以用国内镜像（已加入 fallback 列表）：
```powershell
# 手动 wget（PowerShell 别名）
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv" -OutFile "tools\seed-data\data\ecdict.csv"
```

## 文件确认

下载成功后检查：
```powershell
Test-Path tools\seed-data\data\ecdict.csv
# True
(Get-Item tools\seed-data\data\ecdict.csv).Length
# 应该 > 90000000 (约 90MB)
```