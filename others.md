1.发送钉钉推送格式
### 字段说明

| 字段 | 说明 |
|------|------|
| 作者用户名 | Twitter 用户的 @handle |
| 推文原文 | 完整的推文内容 |
| AI总结 | Kimi AI 生成的内容摘要 |
| 评分 | 1-10 分，评估话题热度、评论空间、涨粉潜力 |
| 评论建议 | AI 给出的具体评论建议 |
| 点赞数/回复数/转发数 | 推文的互动数据 |
| 推文链接 | 点击跳转到原推文 |

### 示例

```
📱 推特：@XXY177
时间
📝 内容：
以为是德高望重的长者，结果是位绅士君子
你们没发现吗，一般长寿的，都是老人
💬 AI总结：
这是一条幽默类推文，用反转手法制造笑点...
⭐ 评分：7.0/10
💡 评论建议：
可以从幽默角度回应，比如"长寿的秘诀是保持绅士风度吗😄"
👍 42 💬 8 🔄 5
🔗 https://x.com/XXY177/status/2037341207186243976

2.自动刷我关注的推特用户，把他们的推特及时发给我到钉钉，5分钟扫描一次
  基于ai把它的推文内容总结、分类，并记录，并判断这篇帖子是否适合评论并打分
  给出评论建议，提出不同的看法、写一篇关于xx的文章、分享一组相关的数据

3.架构确认
    Kimi API 配置
    • API coding key 是否已准备好？sk-kimi-9wUzwv2Moa7bRcgqfdoOXIpDIqLJR9VChfV4x5dl8NwaDlszGW3oCrcRqm6DnB58
    • 使用哪个模型？kimi-k2-thinking
    • 是否需要设置超时时间？2min

    MongoDB 连接
    本地基于docker自动构建
    数据库名称是什么？建议 social_tool,把相应的库表建好

    bird-cli 认证
    auth_token：66196d93a694a9c1f31ac34b08f11b764e7ddd62
    ct0:63ae439800bd83320eb70389942bc4a6d81a5c15bf93a031f1e11903556b1065bc423b6d8addc62092d203b8f2a3f6a42d73056216f478b110d9bf82c6f59d45c610059161640d7f1f9e1b1b91d6021d

    钉钉 Webhook
    Webhook URL:https://oapi.dingtalk.com/robot/send?access_token=3aa3d51d8e0d30f7a6038ea085d90b3e00ae28a11fb0d72ce7d0bd91207f4abc
    默认这一个，写入到测试用户表里

    监控列表初始化
    首次启动时，监控列表（user_monitored_accounts）如何初始化？
    是手动插入数据库，用这个人的推特 https://x.com/XXY177

    AI Processor 并发数
    默认3个

    日志输出
    • 日志输出到控制台还是文件？文件，存放本地 以日每日截断
    • 日志级别：（Debug / Info / Warn / Error）

    部署方式
    本地开发测试

