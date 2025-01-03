package script

import (
	"fmt"
	"net/url"
	"runtime"
	"sync"

	"github.com/gorilla/websocket"
	lua "github.com/yuin/gopher-lua"
)

type WebsocketModule struct {
	conn *websocket.Conn
	done chan struct{} // 通知协程停止的通道

	q   []queue
	qmu sync.Mutex

	repolst []Report
}

type queue struct {
	buff []byte
}

var (
	ErrNil = lua.LString("nil")
)

func NewWebsocketModule() *WebsocketModule {
	return &WebsocketModule{
		done: make(chan struct{}),
	}
}

func (ws *WebsocketModule) Loader(L *lua.LState) int {

	// 创建主模块表
	mod := L.NewTable()

	// 创建构造函数
	constructor := L.NewFunction(func(L *lua.LState) int {
		// 创建新的 WebsocketModule 实例

		wsInstance := NewWebsocketModule()

		// 创建实例的方法表
		mt := L.NewTable()
		L.SetFuncs(mt, map[string]lua.LGFunction{
			"dail":   wsInstance.dail,
			"close":  wsInstance.Close,
			"read":   wsInstance.readmsg,
			"write":  wsInstance.writemsg,
			"report": wsInstance.report,
		})

		// 设置 __index 元方法
		L.SetField(mt, "__index", mt)
		L.SetFuncs(mt, methods)

		ud := L.NewUserData()
		ud.Value = wsInstance
		L.SetMetatable(ud, mt)

		L.Push(ud)
		return 1
	})

	// 设置构造函数为模块的 new 方法
	L.SetField(mod, "new", constructor)
	L.Push(mod)
	return 1

}

func (ws *WebsocketModule) dail(L *lua.LState) int {
	// 检查必需参数数量 (self + 3个必需参数)
	if L.GetTop() < 4 {
		fmt.Println("Not enough parameters. Expected: self, protocol, addr, port, [path]")
		return 0
	}

	protocol := L.ToString(2)
	addr := L.ToString(3)
	port := L.ToString(4)
	// path 是可选参数
	path := "/"
	if L.GetTop() >= 5 {
		path = L.ToString(5)
	}

	fmt.Printf("Dail function called with params: protocol=%s, addr=%s, port=%s, path=%s\n",
		protocol, addr, port, path)

	err := ws._dail(protocol, addr, port, path)
	if err != nil {
		L.Push(lua.LString(err.Error()))
		return 1
	}

	L.Push(ErrNil)
	return 1
}

func (ws *WebsocketModule) _read() {
	if ws.conn == nil {
		return
	}

	for {
		select {
		case <-ws.done:
			fmt.Println("chan exit")
			return
		default:

			defer func() {
				if r := recover(); r != nil {
					var buf [4096]byte
					n := runtime.Stack(buf[:], false)
					fmt.Println("panic:", string(buf[:n]))
				}
			}()

			_, msg, err := ws.conn.ReadMessage()
			if err != nil {
				fmt.Println("read msg err", err.Error())
				return
			}

			ws.qmu.Lock()
			ws.q = append(ws.q, queue{buff: msg})
			ws.qmu.Unlock()
		}
	}
}

func (ws *WebsocketModule) _dail(scheme string, host string, port string, path string) error {

	u := url.URL{Scheme: scheme, Host: host + ":" + port, Path: path}

	fmt.Println("_dail =>", u.String())

	c, _, err := websocket.DefaultDialer.Dial(u.String(), nil)
	if err != nil {
		return fmt.Errorf("dial:%s", err.Error())
	}

	ws.conn = c
	go ws._read()

	return nil
}

func (ws *WebsocketModule) _close() {
	if ws.conn != nil {
		ws.conn.Close()
		ws.conn = nil

		close(ws.done)
	}
}

func (ws *WebsocketModule) Close(L *lua.LState) int {
	ws._close()
	L.Push(ErrNil)
	return 1
}

func (ws *WebsocketModule) readmsg(L *lua.LState) int {
	if ws.conn == nil {
		L.Push(lua.LString(""))
		L.Push(lua.LString("not connected"))
		return 2
	}

	ws.qmu.Lock()
	if len(ws.q) == 0 {
		ws.qmu.Unlock()
		L.Push(lua.LString(""))
		L.Push(lua.LString("empty"))
		return 2
	}

	L.Push(lua.LString(ws.q[0].buff))
	L.Push(ErrNil)
	ws.q = ws.q[1:]
	ws.qmu.Unlock()

	return 2
}

func (ws *WebsocketModule) writemsg(L *lua.LState) int {

	if ws.conn == nil {
		L.Push(lua.LString("not connected"))
		return 1
	}

	buf := L.ToString(2)
	err := ws.conn.WriteMessage(websocket.BinaryMessage, []byte(buf))
	if err != nil {
		L.Push(lua.LString(err.Error()))
		return 1
	}

	L.Push(ErrNil)
	return 1
}

func (t *WebsocketModule) report(L *lua.LState) int {
	id := L.ToString(2)
	errmsg := L.ToString(3)
	t.repolst = append(t.repolst, Report{id, errmsg})
	return 0
}

func (ws *WebsocketModule) GetReport() []Report {

	rep := []Report{}
	rep = append(rep, ws.repolst...)

	ws.repolst = ws.repolst[:0]

	return rep
}
