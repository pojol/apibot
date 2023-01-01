import * as React from "react";
import { Graph, Addon, Shape, Cell, Node } from "@antv/x6";
import ActionNode from "./shape/shape_action";
import ConditionNode from "./shape/shape_condition";
import SelectorNode from "./shape/shape_selector";
import SequenceNode from "./shape/shape_sequence";
import RootNode from "./shape/shape_root";
import LoopNode from "./shape/shape_loop";
import WaitNode from "./shape/shape_wait";
import ParallelNode from "./shape/shap_parallel";
import { Interp } from '@antv/x6'


/// <reference path="graph.d.ts" />

import {
  NodeTy,
  IsScriptNode,
  IsActionNode,
} from "../../../constant/node_type";
import { Button, Tooltip, Modal, Input } from "antd";
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  AimOutlined,
  BugOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  UndoOutlined,
  CaretRightOutlined,
} from "@ant-design/icons";

import "./graph.css";
import { message } from "antd";
import PubSub from "pubsub-js";
import Topic from "../../../constant/topic";

//import moment from "moment";
import Constant from "../../../constant/constant";
import EditSidePlane from "../side/side";

const { Dnd } = Addon;

// 高亮
const magnetAvailabilityHighlighter = {
  name: "stroke",
  args: {
    attrs: {
      fill: "#fff",
      stroke: "#47C769",
    },
  },
};


/*
function NewStencil(graph: Graph) {
  var selectorNod = new SelectorNode();
  var seqNod = new SequenceNode();
  var condNod = new ConditionNode();
  var loopNod = new LoopNode();
  var waitNod = new WaitNode();
  var parallelNod = new ParallelNode();
  var title = "Components";
  var placeholder = "Search by shape name";
  var g1title = "Normal";
  var g2title = "Prefab";

  if (moment.locale() === "en") {
    selectorNod.setAttrs({ label: { text: "Selector" } });
    seqNod.setAttrs({ label: { text: "Sequence" } });
    condNod.setAttrs({ label: { text: "Condition" } });
    loopNod.setAttrs({ label: { text: "Loop" } });
    waitNod.setAttrs({ label: { text: "Wait" } });
    parallelNod.setAttrs({ label: { text: "Parallel" } })
  } else if (moment.locale() === "zh-cn") {
    selectorNod.setAttrs({ label: { text: "选择" } });
    seqNod.setAttrs({ label: { text: "顺序" } });
    condNod.setAttrs({ label: { text: "条件" } });
    loopNod.setAttrs({ label: { text: "循环" } });
    waitNod.setAttrs({ label: { text: "等待" } });
    parallelNod.setAttrs({ label: { text: "并行" } })

    title = "组件";
    placeholder = "通过节点名进行搜索";
    g1title = "默认节点";
    g2title = "预制节点";
  }

  let configmap = (window as any).config as Map<string, string>;

  var stencil = new Stencil({
    title: title,
    search(nod, keyword) {
      var attr = nod.getAttrs();
      var label = attr.label.text as String;
      if (label !== null) {
        return label.toLowerCase().indexOf(keyword.toLowerCase()) !== -1;
      }

      return false;
    },
    placeholder: placeholder,
    notFoundText: "Not Found",
    target: graph,
    collapsable: true,
    stencilGraphPadding :10,
    stencilGraphWidth: stencilWidth,
    stencilGraphHeight: 260,
    groups: [
      {
        name: "group1",
        title: g1title,
      },
      {
        name: "group2",
        title: g2title,
        graphWidth:200,
        graphHeight:configmap.size * 30,
        layoutOptions: {columns:1,columnWidth:"auto",rowHeight:30}
      },
    ],
  });

  stencil.load(
    [selectorNod, seqNod, parallelNod, condNod, loopNod, waitNod],
    "group1"
  );

  let prefabnods: Node[] = [];

  configmap.forEach((value: string, key: string) => {
    if (key !== "system" && key !== "global" && key !== "") {
      var nod = new ActionNode();
      nod.setAttrs({
        label: { text: key },
      });
      nod.setSize(140,20)
      nod.setAttrs({body: {rx:3,ry:3,stroke:"#497174"}})
      nod.removePortAt(0)

      prefabnods.push(nod);
    }
  });

  stencil.load(prefabnods, "group2");

  return stencil;
}
*/
function fillChildInfo(child: Node, info: any) {
  var childInfo = {
    id: child.id,
    ty: child.getAttrs().type.toString(),
    pos: {
      x: child.position().x,
      y: child.position().y,
    },
    children: [],
  };
  info.children.push(childInfo);

  child.eachChild((cchild, idx) => {
    if (cchild instanceof Node) {
      fillChildInfo(cchild as Node, childInfo);
    }
  });
}

function GetNodInfo(nod: Node) {
  var info = {
    id: nod.id,
    ty: nod.getAttrs().type.toString(),
    pos: {
      x: nod.position().x,
      y: nod.position().y,
    },
    children: [],
  };

  nod.eachChild((child, idx) => {
    if (child instanceof Node) {
      fillChildInfo(child as Node, info);
    }
  });

  return info;
}

function iterate(nod: Node, callback: (nod: Node) => void) {
  if (nod !== null && nod !== undefined) {
    callback(nod);

    nod.eachChild((children, idx) => {
      iterate(children as Node, callback);
    });
  }
}

export default class GraphView extends React.Component {
  graph: Graph;
  container: HTMLElement;
  dnd: any;
  stencilContainer: HTMLDivElement;

  state = {
    isModalVisible: false,
    behaviorName: "",
    platfrom: "",
    stencil: null,
    debugCreate: false,
    wflex: 0.6,
  };

  /*
  reloadStencil() {
    this.setState({ stencil: NewStencil(this.graph) }, () => {
      if (this.state.stencil != null) {
        var stencil = this.state.stencil as Addon.Stencil;
        this.stencilContainer.appendChild(stencil.container);
      }
    });
  }
  */

  componentDidMount() {
    // 新建画布
    const graph = new Graph({
      width: document.body.clientWidth * this.state.wflex,
      height: document.body.clientHeight - 62,
      container: this.container,
      highlighting: {
        magnetAvailable: magnetAvailabilityHighlighter,
        magnetAdsorbed: {
          name: "stroke",
          args: {
            attrs: {
              fill: "#fff",
              stroke: "#31d0c6",
            },
          },
        },
      },
      snapline: {
        enabled: true,
        sharp: true,
      },
      connecting: {
        snap: true,
        allowBlank: false,
        allowLoop: false,
        allowPort: false,
        highlight: true,
        allowMulti: false,
        connector: "rounded",
        connectionPoint: "boundary",
        router: {
          name: "er",
          args: {
            direction: "V",
          },
        },
        createEdge() {
          return new Shape.Edge({
            attrs: {
              line: {
                stroke: "#a0a0a0",
                strokeWidth: 1,
                targetMarker: {
                  name: "classic",
                  size: 3,
                },
              },
            },
          });
        },
      },
      keyboard: {
        enabled: true,
      },
      grid: {
        size: 10, // 网格大小 10px
        visible: true, // 绘制网格，默认绘制 dot 类型网格
      },
      history: true,
      selecting: {
        enabled: true,
        showNodeSelectionBox: true,
      },
      scroller: {
        enabled: true,
        pageVisible: false,
        pageBreak: false,
        pannable: true,
      },
      mousewheel: {
        enabled: true,
        modifiers: ["alt", "meta"],
      },
    });
    /*
    graph.drawBackground({
      color:"#D6E4E5"
    })
    */

    var root = new RootNode();
    root.setPosition((graph.getGraphArea().width / 2) + 80, (graph.getGraphArea().height / 2) - 200)
    graph.addNode(root);

    PubSub.publish(Topic.NodeAdd, [GetNodInfo(root), true, false]);
    PubSub.publish(Topic.HistoryClean, {});

    graph.bindKey("del", () => {
      this.ClickDel();
      return false;
    });

    graph.bindKey("ctrl+z", () => {
      PubSub.publish(Topic.Undo, {});
    });

    graph.bindKey(["f10", "command+f10", "ctrl+f10"], () => {
      this.ClickStep(1);
    });

    graph.bindKey(["f11", "command+f11", "ctrl+f11"], () => {
      this.ClickReset(1);
    });

    graph.on("edge:removed", ({ edge, options }) => {
      if (!options.ui) {
        return;
      }

      this.findNode(edge.getTargetCellId(), (child) => {
        //var ts = child.removeFromParent( { deep : false } );  // options 没用？
        PubSub.publish(Topic.LinkDisconnect, [child.id, false]);
        child.getParent()?.removeChild(edge);
        //var ts = child.removeFromParent({ deep: false });
        //this.graph.addCell(ts);
      });

      //graph.removeEdge(edge.id);
    });

    graph.on("edge:connected", ({ isNew, edge }) => {
      const source = edge.getSourceNode();
      const target = edge.getTargetNode();

      if (isNew) {
        if (source !== null && target !== null) {
          if (target.getAttrs().type.toString() === NodeTy.Root) {
            message.warning("Cannot connect to root node");
            graph.removeEdge(edge.id, { disconnectEdges: true });
            return;
          }

          if (
            IsScriptNode(source.getAttrs().type.toString()) &&
            source.getChildCount() > 0
          ) {
            message.warning("Action node can only mount a single node");
            graph.removeEdge(edge.id, { disconnectEdges: true });
            return;
          }

          if (target.parent !== undefined && target.parent != null) {
            message.warning("Cannot connect to a node that has a parent node");
            graph.removeEdge(edge.id, { disconnectEdges: true });
            return;
          }

          edge.setZIndex(0);
          source.addChild(target);
          PubSub.publish(Topic.LinkConnect, [
            { parent: source.id, child: target.id },
            false,
          ]);
        }
      }
    });

    graph.on("node:click", ({ node }) => {
      PubSub.publish(Topic.NodeClick, {
        id: node.id,
        type: node.getAttrs().type,
      });
    });

    graph.on("node:added", ({ node, index, options }) => {
      let silent = false;
      let build = true;

      if (options.others !== undefined) {
        silent = options.others.silent;
        build = options.others.build;
      }

      if (node.getAttrs().type.toString() === "ActionNode"){
        node.setSize(40,20)
      }
      //node.setAttrs( { body: {fill:"#D6E4E5"}})
      console.info("node:added",GetNodInfo(node))

      PubSub.publish(Topic.NodeAdd, [GetNodInfo(node), build, silent]);
    });

    graph.on("node:mouseenter", ({ node }) => {
      node.setPortProp(node.getPorts()[0].id as string, "attrs/portBody/r", 8)
    })

    // node:mouseleave 消息容易获取不到，先每次获取到这个消息将所有节点都设置一下
    graph.on("node:mouseleave", ({ node }) => {

      node.setPortProp(node.getPorts()[0].id as string, "attrs/portBody/r", 4)

      var nods = this.graph.getRootNodes();
      if (nods.length > 0) {
        iterate(nods[0], (nod) => {

          if (nod.getAttrs().type !== undefined) {
            nod.setPortProp(nod.getPorts()[0].id as string, "attrs/portBody/r", 4)
          }

        });
      }

    })

    graph.on("node:moved", ({ e, x, y, node, view: NodeView }) => {
      iterate(node, (nod) => {
        if (nod.getAttrs().type !== undefined) {
          var info = {
            id: nod.id,
            ty: nod.getAttrs().type.toString(),
            pos: {
              x: nod.position().x,
              y: nod.position().y,
            },
            children: [],
          };

          PubSub.publish(Topic.UpdateGraphParm, info);
        }
      });

      this.findNode(node.id, (nod) => { });
    });

    graph.on("edge:mouseenter", ({ edge }) => {
      edge.addTools([
        "source-arrowhead",
        "target-arrowhead",
        {
          name: "button-remove",
          args: {
            distance: -30,
            onClick({ e, cell, view }: any) {
              var sourcenod = cell.getSourceNode();
              var targetnod = cell.getTargetNode();
              //
              graph.removeEdge(cell.id, { disconnectEdges: true });
              PubSub.publish(Topic.LinkDisconnect, [targetnod.id, false]);

              sourcenod.unembed(targetnod);
            },
          },
        },
      ]);
    });

    graph.on("edge:mouseleave", ({ edge }) => {
      edge.removeTools();
    });

    // 调整画布大小
    graph.resizeGraph(Constant.GraphWidth, Constant.GraphHeight);
    // 居中显示
    //graph.centerContent();

    this.dnd = new Dnd({
      target: graph,
      scaled: false,
      animation: true,
    });
    this.graph = graph;

    //this.reloadStencil();

    PubSub.subscribe(Topic.ConfigUpdateAll, (topic: string, info: any) => {
     // this.reloadStencil();
    });

    PubSub.subscribe(Topic.UpdateNodeParm, (topic: string, info: any) => {
      if (IsActionNode(info.parm.ty)) {
        this.findNode(info.parm.id, (nod) => {
          nod.setAttrs({
            label: { text: info.parm.alias },
          });
        });
      } else if (info.parm.ty === NodeTy.Loop) {
        this.findNode(info.parm.id, (nod) => {
          nod.setAttrs({
            label: { text: this.getLoopLabel(info.parm.loop) },
          });
        });
      } else if (info.parm.ty === NodeTy.Wait) {
        this.findNode(info.parm.id, (nod) => {
          nod.setAttrs({
            label: { text: info.parm.wait.toString() + " ms" },
          });
        });
      }
    });

    PubSub.subscribe(
      Topic.FileLoadRedraw,
      (topic: string, treearr: Array<any>) => {
        this.graph.clearCells();
        console.info("redraw by undo");

        treearr.forEach((element) => {
          this.redraw(element, false);
        });
      }
    );

    PubSub.subscribe(
      Topic.FileLoadDraw,
      (topic: string, treearr: Array<any>) => {
        this.graph.clearCells();
        console.info("redraw by file");

        treearr.forEach((element) => {
          this.redraw(element, true);
        });

        PubSub.publish(Topic.HistoryClean, {});
      }
    );

    PubSub.subscribe(Topic.Focus, (topic: string, info: Array<string>) => {

      // clean
      this.cleanStepInfo();

      info.forEach(element => {
        this.findNode(element, (nod) => {

          nod.transition(
            "attrs/body/strokeWidth", "4px", {
            interp: Interp.unit,
            timing: 'bounce', // Timing.bounce
          },
          )()
        });
      });

    });

    PubSub.subscribe(
      Topic.EditPanelEditCodeResize,
      (topic: string, flex: number) => {
        this.setState({ wflex: flex }, () => {
          this.resizeViewpoint();
        });
      }
    );

    PubSub.subscribe(
      Topic.EditPanelEditChangeResize,
      (topic: string, flex: number) => {
        this.setState({ hflex: 1 - flex }, () => {
          this.resizeViewpoint();
        });
      }
    );

    PubSub.subscribe(Topic.WindowResize, () => {
      this.resizeViewpoint();
    });

    PubSub.subscribe(Topic.LanuageChange, () => {
      //this.reloadStencil();
    });

    var agent = navigator.userAgent.toLowerCase();
    var isMac = /macintosh|mac os x/i.test(navigator.userAgent);
    if (agent.indexOf("win32") >= 0 || agent.indexOf("wow32") >= 0) {
      this.setState({ platfrom: "win" });
    }
    if (agent.indexOf("win64") >= 0 || agent.indexOf("wow64") >= 0) {
      this.setState({ platfrom: "win" });
    }
    if (isMac) {
      this.setState({ platfrom: "mac" });
    }
  }

  getLoopLabel(val: Number) {
    var tlab = "";
    if (val !== 0) {
      tlab = val.toString() + " times";
    } else {
      tlab = "endless";
    }

    return tlab;
  }

  // 重绘视口
  resizeViewpoint() {
    var width = document.body.clientWidth * this.state.wflex;

    console.info("resize panel", this.state.wflex, document.body.clientHeight);

    // 设置视口大小
    this.graph.resize(width, document.body.clientHeight - 62);
  }

  redrawChild(parent: any, child: any, build: boolean) {
    var nod: Node;

    switch (child.ty) {
      case NodeTy.Selector:
        nod = new SelectorNode({ id: child.id });
        break;
      case NodeTy.Sequence:
        nod = new SequenceNode({ id: child.id });
        break;
      case NodeTy.Condition:
        nod = new ConditionNode({ id: child.id });
        break;
      case NodeTy.Loop:
        nod = new LoopNode({ id: child.id });
        break;
      case NodeTy.Wait:
        nod = new WaitNode({ id: child.id });
        break;
      case NodeTy.Parallel:
        nod = new ParallelNode({ id: child.id })
        break;
      default:
        nod = new ActionNode({ id: child.id });
        console.info("redraw node", child.ty);
        nod.setAttrs({ type: child.ty });
    }

    nod.setPosition({
      x: child.pos.x,
      y: child.pos.y,
    });
    // this.graph.addNode(nod, { "silent": true }); 这样使用会导致浏览器卡死
    this.graph.addNode(nod, { others: { build: build, silent: true } });
    //PubSub.publish(Topic.NodeAdd, this.getNodInfo(nod));

    if (parent) {
      this.graph.addEdge(
        new Shape.Edge({
          attrs: {
            line: {
              stroke: "#a0a0a0",
              strokeWidth: 1,
              targetMarker: {
                name: "classic",
                size: 3,
              },
            },
          },
          zIndex: 0,
          source: parent,
          target: nod,
        })
      );

      parent.addChild(nod);
      PubSub.publish(Topic.LinkConnect, [
        { parent: parent.id, child: nod.id },
        true,
      ]);
    }

    if (IsScriptNode(child.ty)) {
      nod.setAttrs({ label: { text: child.alias } });
      PubSub.publish(Topic.UpdateNodeParm, {
        parm: {
          id: nod.id,
          ty: child.ty,
          code: child.code,
          alias: child.alias,
        },
        notify: false,
      });
    } else if (child.ty === NodeTy.Loop) {
      nod.setAttrs({ label: { text: this.getLoopLabel(child.loop) } });
      PubSub.publish(Topic.UpdateNodeParm, {
        parm: {
          id: nod.id,
          ty: child.ty,
          loop: child.loop,
        },
        notify: false,
      });
    } else if (child.ty === NodeTy.Wait) {
      nod.setAttrs({ label: { text: child.wait.toString() + " ms" } });
      PubSub.publish(Topic.UpdateNodeParm, {
        parm: {
          id: nod.id,
          ty: child.ty,
          wait: child.wait,
        },
        notify: false,
      });
    } else if (child.ty === NodeTy.Sequence) {
      nod.setAttrs({ label: { text: "seq" } });
    } else if (child.ty === NodeTy.Selector) {
      nod.setAttrs({ label: { text: "sel" } });
    } else if (child.ty === NodeTy.Parallel) {
      nod.setAttrs({ label: { text: "par" } });
    }

    if (child.children && child.children.length) {
      for (var i = 0; i < child.children.length; i++) {
        this.redrawChild(nod, child.children[i], build);
      }
    }
  }

  redraw(jsontree: any, build: boolean) {
    if (jsontree.ty === NodeTy.Root) {
      var root = new RootNode({ id: jsontree.id });
      root.setPosition({
        x: jsontree.pos.x,
        y: jsontree.pos.y,
      });

      this.graph.addNode(root, { others: { build: build, silent: true } });

      if (jsontree.children && jsontree.children.length) {
        for (var i = 0; i < jsontree.children.length; i++) {
          this.redrawChild(root, jsontree.children[i], build);
        }
      }
    } else {
      this.redrawChild(null, jsontree, build);
    }
  }

  setLabel(id: String, name: String) {
    var flag = false;
    this.findNode(id, (nod) => {
      flag = true;
    });

    if (!flag) {
      message.warning("没有在树中查找到该节点 " + id);
    }
  }

  refStencil = (container: HTMLDivElement) => {
    this.stencilContainer = container;
  };

  refContainer = (container: HTMLDivElement) => {
    this.container = container;
  };

  findChild = (parent: Cell, id: String, callback: (nod: Cell) => void) => {
    if (parent.id === id) {
      callback(parent);
      return;
    } else {
      parent.eachChild((child, idx) => {
        this.findChild(child, id, callback);
      });
    }
  };

  findNode = (id: String, callback: (nod: Cell) => void) => {
    var nods = this.graph.getRootNodes();
    if (nods.length >= 0) {
      if (nods[0].id === id) {
        callback(nods[0]);
      } else {
        nods[0].eachChild((child, idx) => {
          this.findChild(child, id, callback);
        });
      }
    }
  };

  ClickZoomIn = () => {
    this.graph.zoomTo(this.graph.zoom() * 1.2);
  };

  ClickZoomOut = () => {
    this.graph.zoomTo(this.graph.zoom() * 0.8);
  };

  ClickZoomReset = () => {
    this.graph.zoomTo(1);
  };

  ClickUndo = () => {
    PubSub.publish(Topic.Undo, {});
  };

  ClickDel = () => {
    const cells = this.graph.getSelectedCells();

    if (cells.length) {
      for (var i = 0; i < cells.length; i++) {
        if (cells[i].getAttrs().type.toString() !== NodeTy.Root) {
          this.removeCell(cells[i]);
        }
      }
    }
  };

  removeCell(cell: Cell) {
    if (cell.getParent() == null) {
      this.graph.removeCell(cell);
    } else {
      PubSub.publish(Topic.NodeRmv, cell.id);
      cell.getParent()?.removeChild(cell);
    }
  }

  behaviorNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ behaviorName: e.target.value });
  };

  modalHandleOk = () => {
    this.setState({ isModalVisible: false });
    if (this.state.behaviorName !== "") {
      PubSub.publish(Topic.Upload, this.state.behaviorName);
    } else {
      message.warning("please enter the file name of the behavior tree");
    }
  };

  modalHandleCancel = () => {
    this.setState({ isModalVisible: false });
  };

  ClickUpload = () => {
    this.setState({ isModalVisible: true });
  };

  ClickStep = (e: any) => {
    PubSub.publish(Topic.Step, {});
  };

  cleanStepInfo = () => {
    // clean
    var nods = this.graph.getRootNodes();
    if (nods.length > 0) {
      iterate(nods[0], (nod) => {
        nod.setAttrs({
          body: {
            strokeWidth: 1,
          },
        });
      });
    }
  };

  onStepValueChange = (e: any) => {
    this.setState({ stepVal: e })
  };

  ClickReset = (e: any) => {
    this.cleanStepInfo();
    PubSub.publish(Topic.Create, {});
  };

  render() {
    return (
      <div className="app">
        <EditSidePlane graph={this.graph}></EditSidePlane>
        <div className="app-content" ref={this.refContainer} />
        
        <div className={"app-zoom-" + this.state.platfrom}>
          <Tooltip placement="leftTop" title="ZoomIn">
            <Button icon={<ZoomInOutlined />} onClick={this.ClickZoomIn} />
          </Tooltip>
          <Tooltip placement="leftTop" title="Reset">
            <Button icon={<AimOutlined />} onClick={this.ClickZoomReset} />
          </Tooltip>
          <Tooltip placement="leftTop" title="ZoomOut">
            <Button icon={<ZoomOutOutlined />} onClick={this.ClickZoomOut} />
          </Tooltip>
          <Tooltip placement="leftTop" title="Undo [ ctrl+z ]">
            <Button icon={<UndoOutlined />} onClick={this.ClickUndo} />
          </Tooltip>
          <Tooltip placement="leftTop" title="Delete [ del ]">
            <Button icon={<DeleteOutlined />} onClick={this.ClickDel} />
          </Tooltip>
        </div>

        <div className={"app-step-" + this.state.platfrom}>
          <Tooltip placement="topRight" title={"Run to the next node [F10]"}>
            <Button
              type="primary"
              style={{ width: 70 }}
              icon={<CaretRightOutlined />}
              onClick={this.ClickStep}
            >
              { }
            </Button>
          </Tooltip>
        </div>
        <div className={"app-reset-" + this.state.platfrom}>
          <Tooltip placement="topRight" title={"Create or reset to starting point [F11]"}>
            <Button
              icon={<BugOutlined />}
              style={{ width: 50 }}
              onClick={this.ClickReset}
            >
              {" "}
            </Button>
          </Tooltip>
        </div>
        <div className={"app-upload-" + this.state.platfrom}>
          <Tooltip placement="topRight" title={"Upload the bot to the server"}>
            <Button
              icon={<CloudUploadOutlined />}
              style={{ width: 50 }}
              onClick={this.ClickUpload}
            >
            </Button>
          </Tooltip>
        </div>

        <Modal
          visible={this.state.isModalVisible}
          onOk={this.modalHandleOk}
          onCancel={this.modalHandleCancel}
        >
          <Input
            placeholder="input behavior file name"
            onChange={this.behaviorNameChange}
          />
        </Modal>
      </div>
    );
  }
}
