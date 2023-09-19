"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  getConnectedEdges,
} from "reactflow";
import "reactflow/dist/style.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { SettingsPanel } from "@/components/sections/SettingsPanel";
import { notifyError, notifySuccess } from "@/components/Helpers/Notification";
import {
  initNodes,
  nodeTypes,
} from "@/components/constants/WorkflowNodeConstants";

let id = 1;
const getId = () => `${id++}`;

export default function Homepage() {
  //Reference for the flow wrapper
  const reactFlowWrapper = useRef(null);

  //States provided by React Flow
  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  //React State to store Saved Workflows
  const [saved, setSaved] = useState();

  //React state to store the currently selected Node
  const [selectedNode, setSelectedNode] = useState("");

  //React State to store Messages
  const [nodeMessages, setNodeMessages] = useState([
    { id: "0", message: "Initial Node", content:{json:{param:"here"}} },
  ]);

  //Function to handle edge connections
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  //This function is called when there is a change in [nodeMessages, setNodes, selectedNode] values to
  // recompute the Nodes when there is a change in any of the following states
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        let {message, content} = connectToMessage(node.data.id);
        node.data = {
          ...node.data,
          selectedNode,
          setSelectedNode,
          message,
          content
        };

        return node;
      })
    );
  }, [nodeMessages, setNodes, selectedNode]);

  // This function acts to act as a connection between the nodeMessages Array and the state of the Nodes
  const connectToMessage = (id) => {
    let message = "";
    let content = {};
    nodeMessages.map((msg) => {
      if (id === msg.id) {
        message = msg.message;
        content = msg.content;
      }
    });
    return {message, content};
  };

  // This fucntion is used to filter the Messages Array when a Node is Deleted
  const onNodesDelete = useCallback(
    (deleted) => {
      let msgArray = [];
      nodeMessages.map((msg) => {
        if (deleted[0].data.id !== msg.id) {
          msgArray.push(msg);
        } else {
          msgArray.push({ id: msg.id, message: "" });
        }
      });
      setNodeMessages(msgArray);
    },
    [nodes, edges]
  );

  // This function handles the change Message Values
  const handleChangeMessage = (k, e) => {
    let newStack = [];
    console.log({k,e})
    nodeMessages.map((value) => {
      if (value.id === selectedNode) {
        const push = { id: value.id };
        push[k] = e.target.value;
        newStack.push(push);
      } else {
        newStack.push(value);
      }
    });
    setNodeMessages(newStack);
  };

  // Drag And Drop Handlers Start
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = (event) => {
    event.preventDefault();

    const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
    const type = event.dataTransfer.getData("application/reactflow");

    // check if the dropped element is valid
    if (typeof type === "undefined" || !type) {
      return;
    }

    const position = reactFlowInstance.project({
      x: event.clientX - reactFlowBounds.left,
      y: event.clientY - reactFlowBounds.top,
    });
    const id = getId();
    let message = `Message ${id}`;
    let msgArray = nodeMessages;
    msgArray.push({ id: id, message: message });
    setNodeMessages(msgArray);
    const newNode = {
      id: id,
      type,
      position,
      data: {
        id: id,
        message: message,
        content: {json:{param:"here"}},
        selectedNode: selectedNode,
        setSelectedNode: setSelectedNode,
      },
    };

    setNodes((nds) => nds.concat(newNode));
  };

  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };
  // Drag And Drop Handlers End

  // Save Reset and Load Handlers Start
  const saveHandler = () => {
    if (nodes.length === 1) {
      setSaved({
        nodes: nodes,
        edges: edges,
        nodeMessages: nodeMessages,
        id: id,
      });
      notifySuccess("Saved Successfully");
    } else {
      let errorFound = 0;
      nodes.map((node) => {
        const connectedEdges = getConnectedEdges([node], edges);
        if (connectedEdges.length === 0) {
          errorFound++;
        }
      });
      if (errorFound > 0) {
        notifyError("Cannot Save Flow");
      } else {
        setSaved({
          nodes: nodes,
          edges: edges,
          nodeMessages: nodeMessages,
          id: id,
        });
        notifySuccess("Saved Successfully");
      }
    }
  };

  const resetHandler = () => {
    try {
      setNodes(initNodes);
      setEdges([]);
      setNodeMessages([{ id: "0", message: "Initial Node", content:{json:{param:"here"}} }]);
      setSelectedNode("");
      id = 1;
      notifySuccess("Reset Successfully");
    } catch (e) {
      notifyError("Failed");
    }
  };

  const loadHandler = () => {
    try {
      setNodes(saved.nodes);
      setEdges(saved.edges);
      setNodeMessages(saved.nodeMessages);
      setSelectedNode("");
      id = saved.id;
      notifySuccess("Load Success");
    } catch (e) {
      notifyError("Failed");
    }
  };
  // Save Reset and Load Handlers End

  return (
    <>
      <div className="mx-5 md:mx-16">
        <div className="w-full mt-5 flex flex-col-reverse md:flex-row items-start justify-between gap-4 ">
          {/* <Container> */}
          <div className="w-full md:w-8/12">
            <div className="w-full relative overflow-hidden rounded-[2.4rem] border border-transparent-white bg-[radial-gradient(ellipse_at_center,rgba(var(--feature-color),0.15),transparent)] py-6 px-8 before:pointer-events-none before:absolute before:inset-0 before:bg-glass-gradient md:rounded-[4.8rem] md:p-14">
              <ReactFlowProvider>
                <div
                  className="w-full reactflow-wrapper h-[600px] rounded-2xl"
                  ref={reactFlowWrapper}
                  style={{ height: 800 }}
                >
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodesDelete={onNodesDelete}
                    onConnect={onConnect}
                    onInit={setReactFlowInstance}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    nodeTypes={nodeTypes}
                    fitView
                    proOptions={{ hideAttribution: true }}
                  >
                    <Controls />
                  </ReactFlow>
                </div>
              </ReactFlowProvider>
            </div>
          </div>

          <div className="w-full md:w-4/12 ">
            <SettingsPanel
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
              nodeMessages={nodeMessages}
              handleChangeMessage={handleChangeMessage}
              saved={saved}
              saveHandler={saveHandler}
              onDragStart={onDragStart}
              loadHandler={loadHandler}
              resetHandler={resetHandler}
            />
          </div>
        </div>
      </div>
      <ToastContainer />
    </>
  );
}
