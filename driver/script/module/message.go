package script

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"io"

	lua "github.com/yuin/gopher-lua"
)

const (
	Little = "LittleEndian"
	Big    = "BigEndian"
)

type Message struct {
	buff     []byte
	byteSort string
	msglen   int
	br       *bytes.Reader // 用于读取
	bw       *bytes.Buffer // 用于写入
	bs       binary.ByteOrder
}

const luaMessageType = "message"

// Registers type to given L.
func RegisterMessageType(L *lua.LState) {
	mt := L.NewTypeMetatable(luaMessageType)
	L.SetGlobal(luaMessageType, mt)
	// static attributes
	L.SetField(mt, "new", L.NewFunction(newMessage))
	// methods
	L.SetField(mt, "__index", L.SetFuncs(L.NewTable(), methods))
}

// Constructor
//
// buff - 需要解析的二进制数据
// byteSort - 字节序
// msglen - 消息长度（用于创建buff）
func newMessage(L *lua.LState) int {
	person := &Message{[]byte(L.ToString(1)), L.CheckString(2), L.CheckInt(3), nil, nil, nil}
	person.br = bytes.NewReader(person.buff)

	if person.msglen != 0 {
		person.bw = bytes.NewBuffer(make([]byte, 0, person.msglen))
	}

	if person.byteSort != Little && person.byteSort != Big {
		person.bs = binary.LittleEndian
		fmt.Println("byteSort is not valid, use default LittleEndian")
		return 1
	}

	if person.byteSort == Little {
		person.bs = binary.LittleEndian
	} else {
		person.bs = binary.BigEndian
	}

	ud := L.NewUserData()
	ud.Value = person
	L.SetMetatable(ud, L.GetTypeMetatable(luaMessageType))
	L.Push(ud)

	return 1
}

// Checks whether the first lua argument is a *LUserData with *Message and returns this *Message.
func checkPerson(L *lua.LState) *Message {
	ud := L.CheckUserData(1)
	if v, ok := ud.Value.(*Message); ok {
		return v
	}
	L.ArgError(1, "person expected")
	return nil
}

var methods = map[string]lua.LGFunction{
	"readi1": readInt8,  // int8 1byte
	"readi2": readInt16, // int16 2byte
	"readi4": readInt32, // int32 4byte
	"readi8": readInt64, // int64 -- number是双精度浮点数范围是 -2^53 到 2^53 之间的整数（注意丢失

	"readBytes": readString, // 读取字符串 2个参数 1.开始位置 2.结束位置 （注: -1表示到末尾）

	// ------------------------------

	"writei1":    writeInt8,
	"writei2":    writeInt16,
	"writei4":    writeInt32,
	"writei8":    writeInt64,
	"writeBytes": writeString,

	// ------------------------------

	"pack": pack, // 将 message 中的 buff 打包成字符串给 lua 使用
}

func readInt8(L *lua.LState) int {
	p := checkPerson(L)

	var i8 int8
	binary.Read(p.br, p.bs, &i8)
	L.Push(lua.LNumber(i8))

	return 1
}

func readInt16(L *lua.LState) int {
	p := checkPerson(L)

	var i16 int16
	binary.Read(p.br, p.bs, &i16)
	L.Push(lua.LNumber(i16))

	return 1
}

func readInt32(L *lua.LState) int {
	p := checkPerson(L)

	var i32 int32
	binary.Read(p.br, p.bs, &i32)
	L.Push(lua.LNumber(i32))

	return 1
}

func readInt64(L *lua.LState) int {
	p := checkPerson(L)

	var i64 int64
	binary.Read(p.br, p.bs, &i64)
	L.Push(lua.LNumber(i64))

	return 1
}

func readString(L *lua.LState) int {
	p := checkPerson(L)
	length := L.CheckInt(2)

	if length == -1 {
		// 读取剩余的所有数据
		bytes, _ := io.ReadAll(p.br)
		L.Push(lua.LString(bytes))
	} else {
		bytes := make([]byte, length)
		_, err := io.ReadFull(p.br, bytes)
		if err != nil {
			L.Push(lua.LNil)
			L.Push(lua.LString(err.Error()))
			return 2
		}
		L.Push(lua.LString(bytes))
	}

	return 1
}

func pack(L *lua.LState) int {
	p := checkPerson(L)

	bytes := p.bw.Bytes()
	L.Push(lua.LString(bytes))

	return 1
}

func writeInt8(L *lua.LState) int {
	p := checkPerson(L)
	i8 := L.ToInt(2)

	binary.Write(p.bw, p.bs, int8(i8))

	return 0
}

func writeInt16(L *lua.LState) int {
	p := checkPerson(L)
	u16 := L.ToInt(2)

	binary.Write(p.bw, p.bs, int16(u16))

	return 0
}

func writeInt32(L *lua.LState) int {
	p := checkPerson(L)
	u32 := L.ToInt(2)

	binary.Write(p.bw, p.bs, int32(u32))

	return 0
}

func writeInt64(L *lua.LState) int {
	p := checkPerson(L)
	u64 := L.ToInt64(2)

	binary.Write(p.bw, p.bs, int64(u64))

	return 0
}

func writeString(L *lua.LState) int {
	p := checkPerson(L)
	str := L.ToString(2)

	binary.Write(p.bw, p.bs, []byte(str))

	return 0
}
