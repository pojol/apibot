import HeartTask from "@/task/heart";
import React, { useState, useEffect } from 'react';

// You will need to import the styles separately
// You probably want to do this just once during the bootstrapping phase of your application.
import "react-reflex/styles.css";

// then you can import the components
import { ReflexContainer, ReflexSplitter, ReflexElement, HandlerProps } from "react-reflex";

/// <reference path="@/edit/node.d.ts" />

import "./editor.css"
import GraphView from "./edit/graph"
import Blackboard from "./edit/blackboard";
import Nodes from "./edit/node/tab"

import { NodeTy } from "@/constant/node_type";
import { useDispatch } from 'react-redux';
import { setEditFlex, setGraphFlex } from "@/models/resize";

export default function Editor() {

  const dispatch = useDispatch()

  useEffect(() => {
    const heartTaskComponent = <HeartTask />;

    if (localStorage.codeboxTheme === undefined || localStorage.codeboxTheme === "") {
      localStorage.codeboxTheme = "ayu-dark"
    }
  }, []);

  const onResizeEditPane = (domElement: HandlerProps) => {
    dispatch(setEditFlex(domElement.component.props.flex ?? 0.4))
  }

  const onResizeGraphPane = (domElement: HandlerProps) => {
    dispatch(setGraphFlex(domElement.component.props.flex ?? 0.6))
  }


    return (
      <div>
        <div className="container">
          <HeartTask />
          <ReflexContainer orientation="vertical">
            <ReflexElement className="left-pane" flex={0.6} minSize={200} onStopResize={onResizeGraphPane}>
              <ReflexContainer orientation="horizontal">
                <ReflexElement className="left-pane" minSize={300} flex={1} >
                  <GraphView />
                </ReflexElement>
              </ReflexContainer>
            </ReflexElement>

            <ReflexSplitter propagate={true} />

            <ReflexElement className="right-pane" flex={0.4} minSize={100}>
              <ReflexContainer orientation="horizontal">
                <ReflexElement className="left-pane" minSize={100} propagateDimensions={true} onStopResize={onResizeEditPane}>
                  <Nodes />
                </ReflexElement>

                <ReflexSplitter />

                <ReflexElement className="left-pane" minSize={100}>
                  <Blackboard />
                </ReflexElement>
              </ReflexContainer>
            </ReflexElement>
          </ReflexContainer>
        </div>
      </div>
    );
}