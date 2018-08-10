// @flow

import {EdgeAddress, NodeAddress} from "../../../core/graph";
import {aggregateByNodeType, aggregateByConnectionType} from "./aggregate";

describe("app/credExplorer/aggregate", () => {
  function example() {
    const nodes = {
      root: NodeAddress.fromParts(["root"]),
      zap: NodeAddress.fromParts(["zap"]),
      kif: NodeAddress.fromParts(["kif"]),
    };

    const nodeTypes = {
      root: {name: "root", prefix: nodes.root, defaultWeight: 0},
      zap: {name: "zap", prefix: nodes.zap, defaultWeight: 0},
      kif: {name: "kif", prefix: nodes.kif, defaultWeight: 0},
      empty: {name: "empty", prefix: NodeAddress.empty, defaultWeight: 0},
    };

    const nodeTypesArray = [nodeTypes.root, nodeTypes.zap, nodeTypes.kif];

    const edgeTypes = {
      foo: {
        forwardName: "foos",
        backwardName: "foo'd by",
        prefix: EdgeAddress.fromParts(["foo"]),
      },
      bar: {
        forwardName: "bars",
        backwardName: "bar'd by",
        prefix: EdgeAddress.fromParts(["bar"]),
      },
      empty: {
        forwardName: "empty",
        backwardName: "emptied-by",
        prefix: EdgeAddress.empty,
      },
    };
    const edgeTypesArray = [edgeTypes.foo, edgeTypes.bar];

    const edges = {
      rfz4: {
        src: nodes.root,
        dst: nodes.zap,
        address: EdgeAddress.fromParts(["foo", "1"]),
      },
      rfk1: {
        src: nodes.root,
        dst: nodes.kif,
        address: EdgeAddress.fromParts(["foo", "2"]),
      },
      kfr3: {
        src: nodes.kif,
        dst: nodes.root,
        address: EdgeAddress.fromParts(["foo", "3"]),
      },
      rbk2: {
        src: nodes.root,
        dst: nodes.kif,
        address: EdgeAddress.fromParts(["bar", "1"]),
      },
    };

    // All adjacencies are from perspective of "root"
    const adjacencies = {
      loop5: {type: "SYNTHETIC_LOOP"},
      rfz4: {type: "OUT_EDGE", edge: edges.rfz4},
      rfk1: {type: "OUT_EDGE", edge: edges.rfk1},
      rbk2: {type: "OUT_EDGE", edge: edges.rbk2},
      kfr3: {type: "IN_EDGE", edge: edges.kfr3},
    };
    const connections = {
      loop5: {adjacency: adjacencies.loop5, weight: 0.2},
      rfz4: {adjacency: adjacencies.rfz4, weight: 0.2},
      rfk1: {adjacency: adjacencies.rfk1, weight: 0.2},
      rbk2: {adjacency: adjacencies.rbk2, weight: 0.2},
      kfr3: {adjacency: adjacencies.kfr3, weight: 0.2},
    };
    const scoredConnections = {
      loop5: {
        connection: connections.loop5,
        source: nodes.root,
        sourceScore: 0.2,
        connectionScore: 5,
      },
      rfz4: {
        connection: connections.rfz4,
        source: nodes.zap,
        sourceScore: 0.2,
        connectionScore: 4,
      },
      kfr3: {
        connection: connections.kfr3,
        source: nodes.kif,
        sourceScore: 0.2,
        connectionScore: 3,
      },
      rbk2: {
        connection: connections.rbk2,
        source: nodes.kif,
        sourceScore: 0.2,
        connectionScore: 2,
      },
      rfk1: {
        connection: connections.rfk1,
        source: nodes.kif,
        sourceScore: 0.2,
        connectionScore: 1,
      },
    };
    const scoredConnectionsArray = [
      scoredConnections.loop5,
      scoredConnections.rfz4,
      scoredConnections.rfk1,
      scoredConnections.rbk2,
      scoredConnections.kfr3,
    ];
    return {
      nodes,
      edges,
      nodeTypes,
      nodeTypesArray,
      edgeTypes,
      edgeTypesArray,
      adjacencies,
      connections,
      scoredConnections,
      scoredConnectionsArray,
    };
  }
  describe("aggregateByNodeType", () => {
    function exampleNodeAggregation() {
      const {nodeTypesArray, scoredConnectionsArray} = example();
      const aggregations = aggregateByNodeType(
        scoredConnectionsArray,
        nodeTypesArray
      );
      return aggregations;
    }
    it("puts every connection in an aggregation", () => {
      const {scoredConnectionsArray} = example();
      let connectionsFound = 0;
      for (const aggregation of exampleNodeAggregation()) {
        connectionsFound += aggregation.connections.length;
      }
      expect(connectionsFound).toEqual(scoredConnectionsArray.length);
    });
    it("groups connections by node type", () => {
      for (const aggregation of exampleNodeAggregation()) {
        for (const connection of aggregation.connections) {
          expect(
            NodeAddress.hasPrefix(
              connection.source,
              aggregation.nodeType.prefix
            )
          ).toBe(true);
        }
      }
    });
    it("when multiple node types match, it uses the most specific one", () => {
      const {nodeTypes, scoredConnections} = example();
      const aggregations = aggregateByNodeType(
        [scoredConnections.rfz4],
        [nodeTypes.empty, nodeTypes.zap]
      );
      expect(aggregations).toHaveLength(1);
      // It used the zap nodeType rather than the empty nodeType b/c
      // it was more specific
      expect(aggregations[0].nodeType).toEqual(nodeTypes.zap);
    });
    it("summarizes the group size appropriately", () => {
      const {nodeTypesArray, scoredConnectionsArray} = example();
      const aggregations = aggregateByNodeType(
        scoredConnectionsArray,
        nodeTypesArray
      );
      for (const aggregation of aggregations) {
        expect(aggregation.summary.size).toEqual(
          aggregation.connections.length
        );
      }
    });
    it("summarizes the group score appropriately", () => {
      for (const aggregation of exampleNodeAggregation()) {
        const scores = aggregation.connections.map((x) => x.connectionScore);
        const totalScore = scores.reduce((a, b) => a + b);
        expect(aggregation.summary.score).toEqual(totalScore);
      }
    });
    it("does not create empty groups", () => {
      for (const aggregation of exampleNodeAggregation()) {
        expect(aggregation.summary.size).not.toEqual(0);
      }
    });
    it("handles the case where there are no connections", () => {
      const {nodeTypesArray} = example();
      const aggregations = aggregateByNodeType([], nodeTypesArray);
      expect(aggregations).toHaveLength(0);
    });
    it("errors if any connection has no matching type", () => {
      const {scoredConnectionsArray} = example();
      const shouldFail = () => aggregateByNodeType(scoredConnectionsArray, []);
      expect(shouldFail).toThrowError("No matching NodeType");
    });
    it("sorts the aggregations by total score", () => {
      let lastSeenScore = Infinity;
      for (const aggregation of exampleNodeAggregation()) {
        const score = aggregation.summary.score;
        expect(lastSeenScore).toBeGreaterThanOrEqual(score);
        lastSeenScore = score;
      }
    });
    it("within each aggregation, connections are sorted by connectionScore", () => {
      for (const aggregation of exampleNodeAggregation()) {
        let lastSeenScore = Infinity;
        for (const connection of aggregation.connections) {
          const score = connection.connectionScore;
          expect(lastSeenScore).toBeGreaterThanOrEqual(score);
          lastSeenScore = score;
        }
      }
    });
  });

  describe("aggregateByConnectionType", () => {
    function exampleConnectionAggregation() {
      const {
        nodeTypesArray,
        edgeTypesArray,
        scoredConnectionsArray,
      } = example();
      return aggregateByConnectionType(
        scoredConnectionsArray,
        nodeTypesArray,
        edgeTypesArray
      );
    }
    it("puts every connection in an aggregation", () => {
      const {scoredConnectionsArray} = example();
      let connectionsFound = 0;
      for (const aggregation of exampleConnectionAggregation()) {
        for (const nodeAggregation of aggregation.nodeAggregations) {
          connectionsFound += nodeAggregation.connections.length;
        }
      }
      expect(connectionsFound).toEqual(scoredConnectionsArray.length);
    });
    it("groups connections by connection type", () => {
      for (const aggregation of exampleConnectionAggregation()) {
        for (const nodeAggregation of aggregation.nodeAggregations) {
          for (const {connection} of nodeAggregation.connections) {
            const adjacency = connection.adjacency;
            expect(adjacency.type).toEqual(aggregation.connectionType.type);
            if (
              adjacency.type !== "SYNTHETIC_LOOP" &&
              aggregation.connectionType.type !== "SYNTHETIC_LOOP"
            ) {
              expect(
                EdgeAddress.hasPrefix(
                  adjacency.edge.address,
                  aggregation.connectionType.edgeType.prefix
                )
              ).toBe(true);
            }
          }
        }
      }
    });
    it("when multiple edge types match, it uses the most specific one", () => {
      const {nodeTypes, edgeTypes, scoredConnections} = example();
      const aggregations = aggregateByConnectionType(
        [scoredConnections.rfz4],
        [nodeTypes.empty],
        [edgeTypes.empty, edgeTypes.foo]
      );
      expect(aggregations).toHaveLength(1);
      const aggregation = aggregations[0];
      if (aggregation.connectionType.type === "SYNTHETIC_LOOP") {
        throw new Error("Unexpected behavior");
      }
      const edgeType = aggregation.connectionType.edgeType;
      expect(edgeType).toEqual(edgeTypes.foo);
    });
    it("summarizes the group size appropriately", () => {
      for (const aggregation of exampleConnectionAggregation()) {
        let empiricalSize = 0;
        for (const nodeAggregation of aggregation.nodeAggregations) {
          empiricalSize += nodeAggregation.summary.size;
        }
        expect(aggregation.summary.size).toEqual(empiricalSize);
      }
    });
    it("summarizes the group score appropriately", () => {
      for (const aggregation of exampleConnectionAggregation()) {
        let empiricalScore = 0;
        for (const nodeAggregation of aggregation.nodeAggregations) {
          empiricalScore += nodeAggregation.summary.score;
        }
        expect(aggregation.summary.score).toEqual(empiricalScore);
      }
    });
    it("does not create empty groups", () => {
      for (const aggregation of exampleConnectionAggregation()) {
        expect(aggregation.summary.size).not.toEqual(0);
      }
    });
    it("handles the case where there are no connections", () => {
      const {nodeTypesArray, edgeTypesArray} = example();
      const aggregations = aggregateByConnectionType(
        [],
        nodeTypesArray,
        edgeTypesArray
      );
      expect(aggregations).toHaveLength(0);
    });
    it("errors if any connection has no matching type", () => {
      const {scoredConnectionsArray, nodeTypesArray} = example();
      const shouldFail = () =>
        aggregateByConnectionType(scoredConnectionsArray, nodeTypesArray, []);
      expect(shouldFail).toThrowError("No matching EdgeType");
    });
    it("sorts the aggregations by total score", () => {
      let lastSeenScore = Infinity;
      for (const aggregation of exampleConnectionAggregation()) {
        const score = aggregation.summary.score;
        expect(lastSeenScore).toBeGreaterThanOrEqual(score);
        lastSeenScore = score;
      }
    });
    it("within each aggregation, sub-aggregations are sorted by score", () => {
      for (const aggregation of exampleConnectionAggregation()) {
        let lastSeenScore = Infinity;
        for (const {
          summary: {score},
        } of aggregation.nodeAggregations) {
          expect(lastSeenScore).toBeGreaterThanOrEqual(score);
          lastSeenScore = score;
        }
      }
    });
  });
});