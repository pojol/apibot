package behavior

import (
	"time"
)

type WaitAction struct {
	INod
	base Node

	wait    int64
	endtime int64
}

func (a *WaitAction) Init(t *Tree, parent INod) {
	a.base.Init(t, parent)
	a.wait = int64(t.Wait)
}

func (a *WaitAction) AddChild(nod INod) {
	a.base.AddChild(nod)
}

func (a *WaitAction) getType() string {
	return WAIT
}

func (a *WaitAction) getBase() *Node {
	return &a.base
}

func (a *WaitAction) onTick(t *Tick) error {
	a.base.onTick(t)

	if a.endtime == 0 {
		a.endtime = time.Now().UnixNano()/1000000 + int64(a.wait)
	}

	return nil
}

func (a *WaitAction) onNext(t *Tick) {

	var currTime int64 = time.Now().UnixNano() / 1000000
	if currTime >= a.endtime {
		a.endtime = 0

		if a.base.ChildrenNum() > 0 && !a.base.GetFreeze() {
			a.base.SetFreeze(true)
			t.blackboard.Append([]INod{a.base.Children()[0]})
		} else {
			a.base.parent.onNext(t)
		}

	} else {
		t.blackboard.Append([]INod{a})
	}

}

func (a *WaitAction) onReset() {
	a.endtime = 0
	a.base.SetFreeze(false)

	for _, child := range a.base.Children() {
		child.onReset()
	}
}
