# 简介

> Gobot 是一个支持`可视化`的机器人编辑平台，它依据编辑出来的`行为树`文件进行驱动，同时支持挂接 `lua` 脚本节点 ，用于执行具体的逻辑；

---

### Gobot 是用于处理什么问题的
1. `测试流程中的状态管理` - 当前市面上绝大部分的测试工具都是基于单条API进行测试的，但是我们的业务场景（尤其是游戏和社交）的API会依赖各种状态，例如社交中想要测试一些行为必须先是好友关系，例如游戏中想要进入战斗必须要有编队信息等等；gobot 的整个生命周期都拥有一个全局的状态管理（meta）数据结构，机器人的每个逻辑节点都可以对这个结构进行操作。因此我们可以使用一个bot对应用的一个系统或是整体进行拟人化的测试
2. `降低使用门槛` - 在定制AI逻辑的时候，首先我们想到的是使用代码（或者脚本）进行控制，这会让使用的门槛相对有些高；在 gobot 中我们可以使用界面化的工具（行为树编辑器）对机器人进行流程上的编辑，避免了手写相关控制代码，在脚本层我们也无需关注过多的代码逻辑，只需要实现当前节点的逻辑控制代码即可（还有配套的模板代码和一些辅助功能模块
3. `分层设计，提供远程API接口` - 由于现代的服务器体系中引入了大量的 CI/CD 流程，在使用 gobot 的时候，我们也可以方便的在流程中插入 gobot 的API 调用，来进行集成测试，在完成版本部署后执行一次机器人（调用http请求发起自己指定机器人的阻塞执行）然后观察是否有问题（看逻辑是否正常通过，数据在各种断言节点是否和预期一致）

### Gobot 的构成

|编辑器|驱动端|脚本层|
|-|-|-|
|编辑，调试，管理，查看 Bot|提供Bot的运行时以及脚本层的支撑|通过脚本接口执行Bot的具体逻辑|


### 预览
![img](/res/preview.png)

### 性能

> 单位机器人并发数量下的 QPS

![img](/res/gobot_qps.png)

> 报告概览

![img](/res/gobot_qps_report.png)