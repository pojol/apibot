package behavior

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

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
		// 要将一个节点的日志收集到一起，将alias写入到meta中
		if n.getType() == SCRIPT && mod == Step {
			log := time.Now().Format("2006-01-02 15:04:05") + " tick " + n.getBase().Name() + " " + n.getBase().GetShortID() + " =>"
			t.bs.L.DoString(`
				log.info("` + log + `")
			`)
		}
		err = n.onTick(t)

		state, msg, parseerr = t.stateCheck(mod, n.getType())
		// thread 信息用于编辑器标记运行时节点信息（展示项
		threadInfo := ThreadInfo{
			Number: n.getBase().getThread(),
			CurNod: n.getBase().ID(),
			Change: msg,
		}

		if err != nil {
			log := fmt.Sprintf("<b><u>check err</u></b> thread:%d name:%s id:%s\n%s",
				n.getBase().getThread(),
				n.getBase().ID(),
				n.getBase().Name(),
				err.Error())
			t.bs.L.DoString(`
				log.info("` + log + `")
			`)
		}
		if parseerr != nil {
			//threadInfo.ErrMsg = fmt.Sprintf("%v parse err %v", threadInfo.ErrMsg, parseerr.Error())
		}

		if state != Succ {
			if state == Exit {
				end = true
			} else if state == Break {
				end = true
			} else if state == Error {
				// 节点脚本出错，脚本逻辑自行抛出的错误
				//threadInfo.ErrMsg = fmt.Sprintf("script err %v", msg)
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
