# gobot
Gobot is a powerful stateful API testing robot. It provides a graphical interface for building test scenarios, allows for easy test script writing, step-by-step debugging and pressure testing, and can share and store states between each stage of the testing process. 

[![Go Report Card](https://goreportcard.com/badge/github.com/pojol/gobot)](https://goreportcard.com/report/github.com/pojol/gobot)
[![](https://img.shields.io/badge/%E6%96%87%E6%A1%A3-Doc-2ca5e0?style=flat&logo=github)](https://pojol.gitee.io/gobot/#/)
[![](https://img.shields.io/badge/Trello-Todo-2ca5e0?style=flat&logo=trello)](https://trello.com/b/8eDZ6h7n/)
[![CI](https://github.com/pojol/gobot/actions/workflows/dockerimage.yml/badge.svg?branch=develop)](https://github.com/pojol/gobot/actions/workflows/dockerimage.yml)

[中文](https://github.com/pojol/gobot/blob/master/README_CN.md)


## Quick Installation
> Note: In local running mode, all changes are recorded in memory (not actually saved). To save, please download the files locally; or use the official deployment method.

1. Download the specified version of the editor and driver on the release page. 
2. Execute the driver end in memory mode on the command line `./gobot-driver-win32-v0.3.x.exe --no_database --mock`
3. Start gobot_editor_win_x64_v0.3.x and fill in the driver address http://127.0.0.1:8888
4.  If using for the first time, you can find sample robots in the /sample directory and load them on the bots page.


## Feature

* Utilizes the 'behavior tree' to control the robot's execution order and uses 'scripts' for specific node behaviors, such as making HTTP requests.
* Provides graphical editing and debugging capabilities.
* Allows creating and reusing 'prefab' template nodes in the configuration page.
* Supports driving via HTTP API (post /bot.run -d '{"Name":"a robot"}'), making it easy to integrate into CI.
* Supports multiple protocol formats (HTTP, TCP, etc.).
* Offers 'stress testing' with configurable concurrency settings on the configuration page.


## NodeScript
> Through built-in modules and scripts, we can have rich logical expression capabilities. We can also use global (single bot) meta structures to maintain various state changes of the bot.
```lua
--[[
    Each node has its own independent .lua script for execution. When a node is executed, the script is loaded and run using dostring.
    Users can load desired 'modules' into the script for additional functionalities. For more information, refer to the documentation.
    The script allows defining node execution logic, like sending an HTTP request.
]]--

-- Users can load "modules" they want to use in the script.
-- document https://pojol.gitee.io/gobot/#/zh-cn/script/meta
local http = require("http")

-- request body
req = {
    body = {},       -- post body
    timeout = "10s", -- http timeout  
    headers = {},    -- http headers
}

-- When the robot runs to a node, the execute function will be executed.
function execute()

    -- Here, users can define the execution logic of nodes themselves (for example, sending an HTTP request)
    res, err = http.post("url", req)

    -- todo

    --  state - State code
    --  res - Information displayed in the Response panel
    return state.Succ, res
end
```

## Script Module
| Module | interface |Description |
|-------------|-------------|-------------|
| base64 | `encode` `decode` |Provides base64 encoding/decoding functionality.|
| http | `post` `get` `put` | Support HTTP connection. |
| tcp | `dail` `close` `write` `read` | Support TCP connection. |
| protobuf | `marshal` `unmarshal` | Provides Protobuf operations. |
| mongoDB | `insert` `find` `update` `delete` ... | Provides MongoDB operations. |
| json | `encode` `decode` | Offers JSON functionalities. |
| md5 | `sum` | Calculates MD5 hashes. |
| utils | `uuid` `random` | Generates random values, UUIDs. |
| ... | More modules available. |

## Try it out
Try the editor out [on website](http://43.134.38.169:7777)
driver server address http://43.134.38.169:8888

## Preview
[![image.png](https://i.postimg.cc/t4jMVjp1/image.png)](https://postimg.cc/PPS4B0Lh)
