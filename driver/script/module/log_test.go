package script

import (
	"fmt"
	"testing"

	lua "github.com/yuin/gopher-lua"
)

func TestLogMod(t *testing.T) {
	// 创建一个新的 Lua 状态
	L := lua.NewState()
	defer L.Close()

	// 初始化 LogModule
	logModule := &LogModule{}

	// 注册 LogModule 的 Loader
	logModule.Loader(L)

	// PreloadModule 只适用于 request 场景
	//L.PreloadModule("log", logModule.Loader)

	env := "a"
	// 执行 Lua 脚本
	if err := L.DoString(`
		log.info("This is ` + env + ` message")
	`); err != nil {
		panic(err)
	}

	fmt.Println(logModule.Pop())
	//assert.Equal(t, "arg1: This is a log message\n", logModule.Pop())
}
