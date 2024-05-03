package mock

import (
	"math/rand"
	"net"
	"strconv"
	"time"

	"github.com/gogo/protobuf/proto"
)

const (
	LoginGuest = 1001 // 模拟登录
	Hello      = 1002 // 模拟获取用户信息
	HeroInfo   = 1003 // 模拟获取角色信息
	HeroLvup   = 1004 // 模拟修改角色等级
)

func tcpRouteGuestHandle(conn *net.TCPConn, fd int, msgBody []byte) error {
	var heros []*Hero
	rand.Seed(time.Now().UnixNano())

	acc := createAcc(strconv.Itoa(fd))
	for _, v := range acc.Heros {
		heros = append(heros, &Hero{
			ID: v.ID,
			Lv: v.Lv,
		})
	}

	res := LoginGuestRes{
		AccInfo: &Acc{
			Heros:   heros,
			Diamond: acc.Diamond,
			Gold:    acc.Gold,
		},
		SessionID: acc.SessionID,
	}

	byt, _ := proto.Marshal(&res)

	return writeMsg(conn, LoginGuest, []byte{}, byt)
}

func tcpHelloHandle(conn *net.TCPConn, fd int, msgBody []byte) error {
	var dict = []string{"a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"}
	var msg string

	for i := 0; i < 3; i++ {
		msg += dict[rand.Intn(len(dict)-1)]
	}

	res := HelloRes{
		Message: msg,
	}

	byt, _ := proto.Marshal(&res)

	return writeMsg(conn, Hello, []byte{}, byt)
}

func tcpHeroInfoHandle(conn *net.TCPConn, fd int, msgBody []byte) error {

	req := &GetHeroInfoReq{}
	err := proto.Unmarshal(msgBody, req)
	if err != nil {
		return err
	}

	res := &GetHeroInfoRes{
		HeroInfo: &Hero{},
	}

	acc, err := getAccInfo(req.SessionID)
	if err != nil {
		return err
	}

	for _, v := range acc.Heros {
		if v.ID == req.HeroID {
			res.HeroInfo.ID = v.ID
			res.HeroInfo.Lv = v.Lv
		}
	}

	byt, _ := proto.Marshal(res)

	return writeMsg(conn, HeroInfo, []byte{}, byt)

}

func tcpHeroLvupHandle(conn *net.TCPConn, fd int, msgBody []byte) error {

	req := &HeroLvupReq{}
	err := proto.Unmarshal(msgBody, req)
	if err != nil {
		return err
	}

	acc, err := getAccInfo(req.SessionID)
	if err != nil {
		return err
	}

	for k := range acc.Heros {
		if acc.Heros[k].ID == req.HeroID {
			acc.Heros[k].Lv++
			break
		}
	}

	// response
	var heros []*Hero
	for _, v := range acc.Heros {
		heros = append(heros, &Hero{
			ID: v.ID,
			Lv: v.Lv,
		})
	}

	res := HeroLvupRes{
		AccInfo: &Acc{
			Heros:   heros,
			Diamond: acc.Diamond,
			Gold:    acc.Gold,
		},
	}

	byt, _ := proto.Marshal(&res)

	return writeMsg(conn, HeroLvup, []byte{}, byt)
}
