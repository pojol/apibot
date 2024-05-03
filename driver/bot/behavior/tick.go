package behavior

import (
	"encoding/json"
	"errors"
	"fmt"

	"github.com/pojol/gobot/driver/bot/pool"
	"github.com/pojol/gobot/driver/utils"
	lua "github.com/yuin/gopher-lua"
)

type Tick struct {
	blackboard *Blackboard
	bs         *pool.BotState
	botid      string
}

var (
	ErrorNodeHaveErr = errors.New("node script have error")
)

func NewTick(bb *Blackboard, state *pool.BotState, botid string) *Tick {
	t := &Tick{
		blackboard: bb,
		bs:         state,
		botid:      botid,
	}
	return t
}

func (t *Tick) stateCheck(mode Mode, ty string) (string, string, error) {

	var r1, r2 lua.LValue
	var err error
	var changestr string
	var changeByt []byte
	var changetab map[string]interface{}
	state := Succ

	if ty != SCRIPT { // 不是脚本节点不需要进行返回值处理
		goto ext
	}

	r1 = t.bs.L.Get(-1)
	if r1.Type() != lua.LTNil {
		t.bs.L.Pop(1)
	}
	r2 = t.bs.L.Get(-1)
	if r2.Type() != lua.LTNil {
		t.bs.L.Pop(1)
		state = r2.String()

		if mode == Step {
			if state == Succ || state == Exit {
				tab, ok := r1.(*lua.LTable)
				if ok {
					changetab, err = utils.Table2Map(tab)
					if err != nil {
						goto ext
					}

					changeByt, err = json.Marshal(&changetab)
					if err != nil {
						goto ext
					}
					changestr = string(changeByt)
				}

			} else {
				changestr = r1.String()
			}

		}

	} else {
		goto ext //没有返回值，不需要处理
	}

ext:
	//
	return state, changestr, err
}

func (t *Tick) Do(mod Mode) (state string, end bool) {

	nods := t.blackboard.GetOpenNods()
	t.blackboard.ThreadInfoReset()

	var err, parseerr error
	var msg string

	for _, n := range nods {
		err = n.onTick(t)

		state, msg, parseerr = t.stateCheck(mod, n.getType())

		threadInfo := ThreadInfo{
			Number: n.getBase().getThread(),
			CurNod: n.getBase().ID(),
			Change: msg,
		}

		if err != nil {
			threadInfo.ErrMsg = fmt.Sprintf("tick err %v", err.Error())
			fmt.Println("tick err", threadInfo.ErrMsg)
		}
		if parseerr != nil {
			threadInfo.ErrMsg = fmt.Sprintf("%v parse err %v", threadInfo.ErrMsg, parseerr.Error())
			fmt.Println("tick parse err", threadInfo.ErrMsg)
		}

		if state != Succ {
			if state == Exit {
				end = true
			} else if state == Break {
				end = true
				threadInfo.ErrMsg = fmt.Sprintf("script break err %v", msg)
				fmt.Println("tick break err", threadInfo.ErrMsg)
			} else if state == Error {
				// 节点脚本出错，脚本逻辑自行抛出的错误
				threadInfo.ErrMsg = fmt.Sprintf("script err %v", msg)
				fmt.Println("tick script err", threadInfo.ErrMsg)
			}
		}

		t.blackboard.ThreadFillInfo(threadInfo)
		if end {
			goto ext
		}
	}

	t.blackboard.Reset()

	for _, n := range nods {
		n.onNext(t)
	}

	if t.blackboard.end {
		state = Exit
		end = true
		goto ext
	}

ext:
	return state, end
}
