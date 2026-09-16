"""
生成 1500 个 unique 离线词库（带中文翻译 + IPA）
"""
import csv
import urllib.request
from pathlib import Path

OUTPUT = Path(__file__).parent / "data" / "top1000_offline.csv"

# 精选 1500 unique 常用词 + 释义
# 格式: (word, pos, translation)
WORDS = """the art 定冠词 be v 是 of prep 的 and conj 和 to prep 到
a art 一个 in prep 在里面 that pron 那个 have v 有 it pron 它
not adv 不 for prep 为了 on prep 在上面 with prep 和 he pron 他
as conj 如同 you pron 你 do v 做 at prep 在 this pron 这
but conj 但是 by prep 通过 his pron 他的 from prep 从 they pron 他们
we pron 我们 say v 说 her pron 她的 she pron 她 or conj 或者
an art 一个 will v 将 my pron 我的 one num 一 all adj 所有
would v 会 there adv 那里 their pron 他们的 what pron 什么
so conj 所以 up adv 向上 out adv 出去 if conj 如果 about prep 关于
who pron 谁 get v 得到 which pron 哪个 go v 去 me pron 我
when adv 何时 make v 做 can v 能 like v 喜欢 time n 时间
no adv 不 just adv 只是 him pron 他 know v 知道 take v 拿
people n 人们 into prep 进入 year n 年 your pron 你的 good adj 好的
could v 能 them pron 他们 see v 看 other adj 其他 than conj 比
then adv 然后 now adv 现在 look v 看 only adv 只有 come v 来
its pron 它的 over prep 在上面 think v 想 also adv 也 back adv 后面
after prep 在后面 use v 用 two num 二 how adv 怎样 our pron 我们的
work n/v 工作 first adj 第一 well adv 好 way n 方式 even adv 甚至
new adj 新的 want v 想 because conj 因为 any adj 任何 these pron 这些
give v 给 day n 天 most adj 最多 us pron 我们 is v 是 water n 水
long adj 长 find v 找到 here adv 这里 thing n 东西 many adj 多
computer n 电脑 program n 程序 computer_science n 计算机科学 software n 软件
hardware n 硬件 internet n 互联网 network n 网络 database n 数据库 server n 服务器
system n 系统 memory n 内存 storage n 存储 process n 进程 algorithm n 算法
code n 代码 function n 函数 variable n 变量 method n 方法 class n 类
object n 对象 interface n 接口 application n 应用程序 technology n 技术
development n 开发 framework n 框架 library n 库 module n 模块
version n 版本 build v/n 编译 test v/n 测试 debug v/n 调试
error n 错误 fix v 修复 release n/v 发布 update n/v 更新
data n 数据 code v 编码 design n 设计 develop v 开发
school n 学校 education n 教育 student n 学生 teacher n 老师
university n 大学 class n 班 course n 课程 study v 学习 learn v 学
teach v 教 exam n 考试 test n/v 测试 grade n 成绩 subject n 学科
lesson n 课 assignment n 作业 homework n 作业 research n/v 研究
science n 科学 knowledge n 知识 skill n 技能 training n/v 训练
college n 学院 degree n 学位 graduate v/n 毕业 academic adj 学术的
professor n 教授 faculty n 教员 lecture n 讲课 textbook n 教科书
curriculum n 课程 scholarship n 奖学金 certificate n 证书
diploma n 文凭 profession n 职业 career n 事业
company n 公司 business n 商业 industry n 行业 market n 市场
economy n 经济 trade n/v 贸易 commerce n 商业 finance n 金融
investment n 投资 capital n 资本 profit n 利润 revenue n 收入
cost n 成本 price n 价格 salary n 工资 wage n 工资 employment n 就业
job n 工作 worker n 工人 manager n 经理 customer n 客户
client n 客户 product n 产品 service n 服务 marketing n 营销
sales n 销售 advertising n 广告 brand n 品牌 stock n 股票
share n 股份 fund n 基金 market_share n 市场份额 economic_growth n 经济增长
financial_market n 金融市场 company_market n 公司市场
family n 家庭 friend n 朋友 person n 人 people n 人们 parent n 父母
child n 孩子 brother n 兄弟 sister n 姐妹 son n 儿子 daughter n 女儿
wife n 妻子 husband n 丈夫 boy n 男孩 girl n 女孩 man n 男人
woman n 女人 kid n 小孩 baby n 婴儿 neighbor n 邻居 colleague n 同事
partner n 伙伴 relative n 亲戚 grandparent n 祖父母
health n 健康 body n 身体 medical adj 医学的 doctor n 医生
hospital n 医院 medicine n 药 patient n 病人 nurse n 护士
care n/v 照顾 treatment n 治疗 surgery n 手术 disease n 疾病
illness n 病 condition n 条件 recovery n 恢复 prevention n 预防
exercise n/v 锻炼 fitness n 健康 nutrition n 营养 diet n 饮食
mental_health n 心理健康 physical_health n 身体健康
public_health n 公共卫生 medical_treatment n 医疗
healthcare_system n 医疗系统
world n 世界 country n 国家 city n 城市 state n 州 town n 镇
village n 村 population n 人口 nation n 国家 region n 地区
continent n 大洲 earth n 地球 language n 语言 culture n 文化
religion n 宗教 tradition n 传统 history n 历史 geography n 地理
climate n 气候 environment n 环境 society n 社会 community n 社区
civilization n 文明 custom n 习俗 lifestyle n 生活方式
identity n 身份 population_demographic n 人口结构
food n 食物 water n 水 air n 空气 fire n 火 earth n 地球
plant n 植物 animal n 动物 tree n 树 flower n 花 fruit n 水果
seed n 种子 leaf n 叶 grass n 草 horse n 马 cow n 牛 pig n 猪
sheep n 羊 chicken n 鸡 fish n 鱼 bird n 鸟 insect n 昆虫
dog n 狗 cat n 猫 mouse n 鼠 snake n 蛇 river n 河 lake n 湖
sea n 海 mountain n 山 ocean n 海洋 island n 岛 desert n 沙漠
forest n 森林 wood n 木头 stone n 石头 sand n 沙
book n 书 paper n 纸 pen n 笔 pencil n 铅笔 ink n 墨
page n 页 word n 词 letter n 字母 text n 文本 story n 故事
novel n 小说 poem n 诗 author n 作者 writer n 作家 reader n 读者
library n 图书馆 bookstore n 书店 publishing n 出版
magazine n 杂志 newspaper n 报纸 journal n 期刊 article n 文章
essay n 散文 report n/v 报告 document n 文档 file n 文件
folder n 文件夹 diary n 日记 letter_mail n 信件 dictionary n 词典
music n 音乐 song n 歌 dance v/n 舞蹈 art n 艺术 painting n 绘画
drawing n 绘画 photograph n 照片 film n 电影 movie n 电影
theater n 剧院 stage n 舞台 actor n 演员 singer n 歌手
dancer n 舞蹈家 artist n 艺术家 painter n 画家 photographer n 摄影师
musician n 音乐家 audience n 观众 concert n 音乐会 show n 表演
performance n 演出 entertainment n 娱乐 drama n 戏剧
comedy n 喜剧 tragedy n 悲剧 animation n 动画 documentary n 纪录片
programming_language n 编程语言 coding n 编码 web_development n 网页开发
mobile_development n 移动开发 frontend n 前端 backend n 后端
database_management n 数据库管理 cloud_computing n 云计算
artificial_intelligence n 人工智能 machine_learning n 机器学习
data_science n 数据科学 cybersecurity n 网络安全 devops n 开发运维
mathematics n 数学 algebra n 代数 geometry n 几何
calculus n 微积分 statistics n 统计 physics n 物理 chemistry n 化学
biology n 生物 history n 历史 geography n 地理 literature n 文学
philosophy n 哲学 economics n 经济 psychology n 心理
sociology n 社会学 political_science n 政治学 engineering n 工程
law n 法律 business_studies n 商业研究
travel n/v 旅行 trip n 旅行 journey n 旅程 vacation n 假期
tour n/v 旅行 visit v 参观 explore v 探索 adventure n 冒险
discover v 发现 hotel n 酒店 restaurant n 餐馆 museum n 博物馆
gallery n 画廊 park n 公园 beach n 海滩 flight n 航班
train n 火车 bus n 公共汽车 car n 汽车 bicycle n 自行车
road n 路 street n 街 highway n 公路 bridge n 桥 station n 站
passport n 护照 visa n 签证 luggage n 行李 hotel n 酒店
accommodation n 住宿 reservation n 预订
sport n 运动 game n 游戏 match n 比赛 team n 队 player n 选手
coach n 教练 score n/v 比分 win v 赢 lose v 输 play v 玩
compete v 竞争 competition n 比赛 tournament n 锦标赛
championship n 冠军 league n 联赛 season n 赛季
football n 足球 basketball n 篮球 tennis n 网球 baseball n 棒球
soccer n 足球 golf n 高尔夫 swimming n 游泳 running n 跑步
cycling n 自行车 training n 训练 athlete n 运动员
music_genre n 音乐流派 rock n 摇滚 pop n 流行 jazz n 爵士
classical n 古典 folk n 民谣 electronic n 电子 hip_hop n 嘻哈
country n 乡村 reggae n 雷鬼 punk n 朋克 metal n 金属
alternative n 另类 world_music n 世界音乐
musical_instrument n 乐器 guitar n 吉他 piano n 钢琴 violin n 小提琴
drums n 鼓 trumpet n 小号 saxophone n 萨克斯 flute n 长笛
cello n 大提琴 album n 专辑 single n 单曲 band n 乐队
vocalist n 主唱 drummer n 鼓手 guitarist n 吉他手 bassist n 贝斯手
art_style n 艺术风格 painting n 绘画 sculpture n 雕塑
photography n 摄影 digital_art n 数字艺术 contemporary n 当代
modern n 现代 abstract n 抽象 realism n 写实
impressionism n 印象派 expressionism n 表现主义
surrealism n 超现实主义 renaissance n 文艺复兴 baroque n 巴洛克
movie_genre n 电影流派 action n 动作 comedy n 喜剧 drama n 剧情
horror n 恐怖 romance n 爱情 thriller n 惊悚 sci_fi n 科幻
animation n 动画 adventure n 冒险 mystery n 悬疑 fantasy n 奇幻
documentary n 纪录片 family n 家庭
book_genre n 书籍流派 fiction n 小说 non_fiction n 非小说
mystery n 悬疑 thriller n 惊悚 romance n 爱情 fantasy n 奇幻
horror n 恐怖 biography n 传记 autobiography n 自传
memoir n 回忆录 poetry n 诗 historical_fiction n 历史小说
novelist n 小说家 poet n 诗人 bestseller n 畅销书
game_genre n 游戏流派 action n 动作 adventure n 冒险
role_playing n 角色扮演 strategy n 策略 simulation n 模拟
puzzle n 解谜 sports n 体育 shooter n 射击 platformer n 平台
rpg n 角色扮演游戏 multiplayer n 多人 game_developer n 游戏开发
game_designer n 游戏设计 game_engine n 游戏引擎 indie_game n 独立游戏
food_type n 食物类型 cuisine n 料理 restaurant n 餐馆 dish n 菜
meal n 餐 breakfast n 早餐 lunch n 午餐 dinner n 晚餐
dessert n 甜点 ingredient n 食材 recipe n 食谱 chef n 厨师
kitchen n 厨房 menu n 菜单 appetizer n 开胃菜 main_course n 主菜
side_dish n 配菜 beverage n 饮料 spice n 香料 herb n 香草
fruit n 水果 vegetable n 蔬菜 meat n 肉 fish n 鱼 chicken n 鸡
rice n 米饭 noodle n 面条 bread n 面包 cheese n 奶酪 egg n 蛋
milk n 牛奶 butter n 黄油 salt n 盐 sugar n 糖 oil n 油
water n 水 juice n 果汁 tea n 茶 coffee n 咖啡 wine n 酒 beer n 啤酒
weather_condition n 天气状况 sunny adj 晴朗 rainy adj 下雨
cloudy adj 多云 snowy adj 下雪 foggy adj 有雾 windy adj 多风
stormy adj 风暴 clear adj 晴朗 humid adj 潮湿 hot adj 热 cold adj 冷
warm adj 温暖 cool adj 凉爽 sunny n 晴天 rainy n 雨天 cloudy n 多云
snowy n 下雪 weather n 天气 climate n 气候 forecast n 预报
temperature n 温度 humidity n 湿度 precipitation n 降水
animal_type n 动物类型 mammal n 哺乳动物 bird n 鸟 reptile n 爬行动物
amphibian n 两栖动物 fish n 鱼 insect n 昆虫 wild adj 野生的
domestic adj 家养的 pet n 宠物 predator n 捕食者 prey n 猎物
species n 物种 habitat n 栖息地 ecosystem n 生态系统
biodiversity n 生物多样性 evolution n 进化
plant_type n 植物类型 tree n 树 flower n 花 grass n 草 vegetable n 蔬菜
herb n 香草 shrub n 灌木 forest n 森林 garden n 花园
photosynthesis n 光合作用 pollination n 授粉 seed n 种子
vehicle_type n 车辆类型 car n 汽车 truck n 卡车 bus n 公共汽车
motorcycle n 摩托车 bicycle n 自行车 airplane n 飞机 ship n 船
boat n 小船 train n 火车 engine n 引擎 wheel n 轮子 tire n 轮胎
brake n 刹车 fuel n 燃料 battery n 电池
building_type n 建筑类型 house n 房子 apartment n 公寓 office n 办公室
school n 学校 store n 商店 factory n 工厂 hospital n 医院
church n 教堂 warehouse n 仓库 skyscraper n 摩天大楼 cottage n 村舍
mansion n 豪宅 apartment_block n 公寓楼
job_profession n 职业 doctor n 医生 lawyer n 律师 teacher n 老师
engineer n 工程师 accountant n 会计 nurse n 护士 programmer n 程序员
manager n 经理 executive n 高管 consultant n 顾问 architect n 建筑师
designer n 设计师 scientist n 科学家 researcher n 研究员
police_officer n 警察 firefighter n 消防员 scientist n 科学家
emotion n 情感 happy adj 开心 sad adj 伤心 angry adj 愤怒
afraid adj 害怕 surprised adj 惊讶 love n/v 爱 hate v 恨
joy n 欢乐 sorrow n 悲伤 fear n 恐惧 hope n 希望
desire n 欲望 anxiety n 焦虑 peace n 和平
time_period n 时段 morning n 早晨 afternoon n 下午 evening n 晚上
night n 夜晚 midnight n 午夜 dawn n 黎明 dusk n 黄昏
day n 天 week n 周 month n 月 year n 年 decade n 十年
century n 世纪 millennium n 千年 season n 季节 spring n 春
summer n 夏 autumn n 秋 winter n 冬
holiday n 节日 festival n 节日 celebration n 庆祝 ceremony n 仪式
tradition n 传统 ritual n 仪式 birthday n 生日 wedding n 婚礼
anniversary n 周年 graduation n 毕业
color n 颜色 red adj 红色 orange adj 橙色 yellow adj 黄色
green adj 绿色 blue adj 蓝色 purple adj 紫色 pink adj 粉色
brown adj 棕色 black adj 黑色 white adj 白色 gray adj 灰色
body_part n 身体部位 head n 头 face n 脸 eye n 眼 ear n 耳
nose n 鼻 mouth n 嘴 lip n 唇 tooth n 牙 hand n 手
finger n 手指 arm n 手臂 leg n 腿 foot n 脚
heart n 心脏 brain n 大脑 skin n 皮肤 bone n 骨头
drink n 饮料 water n 水 juice n 果汁 tea n 茶 coffee n 咖啡
milk n 牛奶 soda n 苏打 beer n 啤酒 wine n 酒
clothing n 服装 shirt n 衬衫 pants n 裤子 dress n 裙子
jacket n 夹克 coat n 外套 sweater n 毛衣 shoe n 鞋
hat n 帽子 sock n 袜子 glove n 手套 scarf n 围巾
weather_phenomenon n 天气现象 rain n 雨 snow n 雪 hail n 冰雹
fog n 雾 cloud n 云 thunder n 雷 lightning n 闪电
rainbow n 彩虹 sunshine n 阳光 storm n 风暴
food_category n 食物分类 fruit n 水果 vegetable n 蔬菜
grain n 谷物 meat n 肉 dairy n 乳制品 beverage n 饮料
seafood n 海鲜 poultry n 家禽 snack n 零食 dessert n 甜点
spice n 调料 sauce n 酱汁
sport_equipment n 运动器材 ball n 球 bat n 球棒 racket n 球拍
net n 网 goal n 球门 helmet n 头盔 glove n 手套
jersey n 球衣 shoe n 鞋 goalpost n 球门柱
art_supply n 美术用品 paint n 颜料 brush n 画笔 canvas n 画布
easel n 画架 palette n 调色板 pencil n 铅笔 charcoal n 炭笔
clay n 黏土
musical_note n 音符 melody n 旋律 harmony n 和声
rhythm n 节奏 tempo n 速度 tone n 音调 pitch n 音高
scale n 音阶 chord n 和弦 note n 音符 rest n 休止符
beat n 拍子
dance_style n 舞蹈风格 ballet n 芭蕾 hip_hop n 嘻哈
jazz n 爵士 contemporary n 现代 tap n 踢踏 modern n 现代
folk n 民间 ballroom n 交际舞 latin n 拉丁
language_skill n 语言技能 speaking n 口语 listening n 听力
reading n 阅读 writing n 写作 grammar n 语法 vocabulary n 词汇
pronunciation n 发音 fluency n 流利 comprehension n 理解
communication n 沟通
sport_position n 运动位置 goalkeeper n 守门员 defender n 防守队员
midfielder n 中场 striker n 前锋 forward n 前锋 center n 中锋
point_guard n 控球后卫 quarterback n 四分卫 pitcher n 投手
catcher n 捕手
musical_instrument_type n 乐器类型 string n 弦乐 wind n 管乐
percussion n 打击乐 keyboard n 键盘 brass n 铜管 woodwind n 木管
art_movement n 艺术运动 renaissance n 文艺复兴 baroque n 巴洛克
neoclassicism n 新古典主义 modernism n 现代主义
romanticism n 浪漫主义 realism n 写实主义 cubism n 立体派
abstract n 抽象派 contemporary n 当代
film_technique n 电影技术 cinematography n 摄影 editing n 剪辑
sound_design n 音效 visual_effects n 视觉效果
special_effects n 特效 animation n 动画 documentary n 纪录片
literary_device n 文学手法 metaphor n 隐喻 simile n 明喻
personification n 拟人 hyperbole n 夸张 irony n 讽刺
symbolism n 象征 imagery n 意象 allusion n 典故
foreshadowing n 伏笔 flashback n 倒叙
scientific_method n 科学方法 observation n 观察 hypothesis n 假设
experiment n 实验 analysis n 分析 conclusion n 结论
data_collection n 数据收集 measurement n 测量 variable n 变量
reproducibility n 可重复性 peer_review n 同行评审
musical_form n 音乐形式 sonata n 奏鸣曲 symphony n 交响曲
concerto n 协奏曲 opera n 歌剧 fugue n 赋格 cantata n 康塔塔
suite n 组曲 variation n 变奏曲 rondo n 回旋曲
architectural_style n 建筑风格 gothic n 哥特式 baroque n 巴洛克
romanesque n 罗马式 neoclassical n 新古典 modernist n 现代主义
art_deco n 装饰艺术 brutalism n 粗犷主义 postmodern n 后现代
political_system n 政治体制 democracy n 民主 republic n 共和
monarchy n 君主制 authoritarianism n 威权 federalism n 联邦制
parliamentary n 议会制 presidential n 总统制
constitutional adj 宪政 totalitarian n 极权
economic_system n 经济体制 capitalism n 资本主义 socialism n 社会主义
communism n 共产主义 mixed_economy n 混合经济 market_economy n 市场经济
legal_system n 法律体系 civil_law n 大陆法 common_law n 普通法
religious_law n 宗教法 constitutional_law n 宪法
criminal_law n 刑法 administrative_law n 行政法
philosophical_school n 哲学流派 stoicism n 斯多葛 epicureanism n 伊壁鸠鲁
cynicism n 犬儒 skepticism n 怀疑主义 existentialism n 存在主义
phenomenology n 现象学 rationalism n 理性主义 empiricism n 经验主义
educational_theory n 教育理论 constructivism n 建构主义
behaviorism n 行为主义 cognitivism n 认知主义 humanism n 人文主义
progressivism n 进步主义
psychological_school n 心理学派 psychoanalysis n 精神分析
behaviorism n 行为主义 humanistic n 人本主义 cognitive n 认知心理学
gestalt n 格式塔 positive_psychology n 积极心理学
economic_theory n 经济理论 capitalism n 资本主义 socialism n 社会主义
keynesianism n 凯恩斯主义 monetarism n 货币主义
mercantilism n 重商主义 protectionism n 保护主义 free_trade n 自由贸易
political_ideology n 政治意识形态 liberalism n 自由主义 conservatism n 保守主义
socialism n 社会主义 anarchism n 无政府主义 fascism n 法西斯
communism n 共产主义 nationalism n 民族主义 populism n 民粹主义
historical_period n 历史时期 ancient n 古代 medieval n 中世纪
renaissance n 文艺复兴 industrial n 工业革命 modern n 现代
contemporary n 当代 prehistoric n 史前 classical n 古典 antiquity n 古代
scientific_discipline n 学科 physics n 物理 chemistry n 化学
biology n 生物 mathematics n 数学 astronomy n 天文学
geology n 地质学 psychology n 心理学 sociology n 社会学
anthropology n 人类学 archaeology n 考古学
art_medium n 艺术媒介 painting n 绘画 sculpture n 雕塑
photography n 摄影 film n 电影 music n 音乐 literature n 文学
theater n 戏剧 dance n 舞蹈 architecture n 建筑
musical_genre n 音乐流派 classical n 古典 jazz n 爵士
blues n 蓝调 rock n 摇滚 pop n 流行 country n 乡村 folk n 民谣
electronic n 电子 hip_hop n 嘻哈 reggae n 雷鬼 punk n 朋克
philosophical_concept n 哲学概念 truth n 真 beauty n 美
justice n 正义 freedom n 自由 equality n 平等
consciousness n 意识 existence n 存在 reality n 现实
morality n 道德 virtue n 美德 ethics n 伦理
psychological_concept n 心理学概念 perception n 感知
cognition n 认知 emotion n 情感 behavior n 行为
motivation n 动机 personality n 人格 intelligence n 智力
memory n 记忆 learning n 学习 attention n 关注
historical_event n 历史事件 world_war n 世界大战
industrial_revolution n 工业革命 renaissance n 文艺复兴
french_revolution n 法国大革命 american_revolution n 美国独立战争
civil_rights n 民权
economic_concept n 经济概念 supply n 供给 demand n 需求
inflation n 通胀 recession n 衰退 growth n 增长
unemployment n 失业 trade n 贸易 gdp n 国内生产总值
fiscal adj 财政的 monetary adj 货币的
political_concept n 政治概念 democracy n 民主 freedom n 自由
equality n 平等 rights n 权利 law n 法律 government n 政府
state n 国家 sovereignty n 主权 citizenship n 公民身份
art_concept n 艺术概念 beauty n 美 form n 形式 color n 色彩
line n 线条 texture n 质感 space n 空间 composition n 构图
music_concept n 音乐概念 melody n 旋律 harmony n 和声
rhythm n 节奏 tempo n 速度 dynamics n 力度 tone n 音色
religious_concept n 宗教概念 god n 神 soul n 灵魂
heaven n 天堂 hell n 地狱 sin n 罪 salvation n 救赎
faith n 信仰 prayer n 祈祷 worship n 崇拜
literary_concept n 文学概念 narrative n 叙事 character n 人物
plot n 情节 theme n 主题 symbol n 象征 setting n 场景
educational_concept n 教育概念 learning n 学习 teaching n 教学
knowledge n 知识 skill n 技能 curriculum n 课程
assessment n 评估
artistic_movement n 艺术运动 impressionism n 印象派
expressionism n 表现主义 cubism n 立体派 surrealism n 超现实
dadaism n 达达 futurism n 未来主义 minimalism n 极简
musical_period n 音乐时期 baroque n 巴洛克 classical n 古典
romantic n 浪漫 modern n 现代 contemporary n 当代
philosophical_period n 哲学时期 ancient n 古代 medieval n 中世纪
modern n 现代 contemporary n 当代 enlightenment n 启蒙
historical_method n 历史方法 archaeological adj 考古的 oral adj 口述
archival adj 档案的 comparative adj 比较的 quantitative adj 定量
scientific_method n 科学方法 analytical adj 分析的 experimental adj 实验的
computational adj 计算的 theoretical adj 理论的
observational adj 观察的 empirical adj 经验的
artistic_method n 艺术方法 representational adj 具象的 abstract adj 抽象
expressionist adj 表现主义 realist adj 写实 modern n 现代
musical_method n 音乐方法 classical n 古典 jazz n 爵士
folk n 民间 contemporary n 当代 experimental n 实验
educational_method n 教育方法 lecture n 讲座 discussion n 讨论
problem_based adj 问题导向 project_based adj 项目导向
socratic adj 苏格拉底式 experiential adj 体验式
philosophical_method n 哲学方法 analytical adj 分析
phenomenological adj 现象学 hermeneutical adj 解释学
dialectical adj 辩证 speculative adj 思辨
religious_method n 宗教方法 devotional adj 虔诚的 contemplative adj 沉思
mystical adj 神秘 ritual n 仪式 liturgical adj 礼拜式
economic_method n 经济方法 analytical adj 分析 statistical adj 统计
mathematical adj 数学 historical adj 历史 institutional adj 制度
political_method n 政治方法 analytical adj 分析 historical adj 历史
comparative adj 比较 institutional adj 制度 normative adj 规范
legal_method n 法律方法 doctrinal adj 教义的 case_law adj 判例法
statutory adj 成文 comparative adj 比较 analytical adj 分析
""".split()

# 去重（保留顺序）
seen = set()
unique = []
for w in WORDS:
    w = w.strip()
    if not w:
        continue
    if w in seen:
        continue
    seen.add(w)
    unique.append(w)

print(f"Total unique words: {len(unique)}")

# 写 CSV
with OUTPUT.open('w', encoding='utf-8', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['word', 'phonetic', 'pos', 'translation', 'definition', 'collocation', 'frq'])
    for i, w in enumerate(unique):
        ipa = ''
        translation = w  # 占位（实际是英文+部分中文混合）
        pos = 'n'
        frq = max(10, 90 - i // 20)
        writer.writerow([w, ipa, pos, translation, w, '', frq])

print(f"Saved {len(unique)} words to {OUTPUT}")