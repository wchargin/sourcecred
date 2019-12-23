// @flow

import base64url from "base64url";
import deepFreeze from "deep-freeze";
import {
  projectToJSON,
  projectFromJSON,
  type Project,
  encodeProjectId,
  createProject,
} from "./project";
import {makeRepoId} from "./repoId";
import {toCompat} from "../util/compat";

describe("core/project", () => {
  const foobar = deepFreeze(makeRepoId("foo", "bar"));
  const foozod = deepFreeze(makeRepoId("foo", "zod"));
  const p1: Project = deepFreeze({
    id: "foo/bar",
    repoIds: [foobar],
    discourseServer: null,
    identities: [],
    initiatives: null,
  });
  const p2: Project = deepFreeze({
    id: "@foo",
    repoIds: [foobar, foozod],
    discourseServer: {serverUrl: "https://example.com"},
    identities: [
      {
        username: "example",
        aliases: ["github/example"],
      },
    ],
    initiatives: {
      discourseCategoryId: 12,
      topicBlacklist: [666],
    },
  });
  describe("to/from JSON", () => {
    it("round trip is identity", () => {
      function check(p: Project) {
        const json = projectToJSON(p);
        const p_ = projectFromJSON(json);
        expect(p).toEqual(p_);
      }
      check(p1);
      check(p2);
    });
    it("should upgrade from 0.3.0 formatting", () => {
      // Given
      const body = {
        id: "example-030",
        repoIds: [foobar, foozod],
        discourseServer: {
          serverUrl: "https://example.com",
          apiUsername: "hello-test",
        },
        identities: [],
      };
      const compat = toCompat(
        {type: "sourcecred/project", version: "0.3.0"},
        body
      );

      // When
      const project = projectFromJSON(compat);

      // Then
      expect(project).toEqual({
        ...body,
        // It should strip the apiUsername field, keeping just serverUrl.
        discourseServer: {serverUrl: "https://example.com"},
        // It should default to not using the Initiatives plugin.
        initiatives: null,
      });
    });
    it("should upgrade from 0.3.1 formatting", () => {
      // Given
      const body = {
        id: "example-031",
        repoIds: [foobar, foozod],
        discourseServer: {
          serverUrl: "https://example.com",
          apiUsername: "hello-test",
        },
        identities: [],
      };
      const compat = toCompat(
        {type: "sourcecred/project", version: "0.3.1"},
        body
      );

      // When
      const project = projectFromJSON(compat);

      // Then
      expect(project).toEqual({
        ...body,
        // It should strip the apiUsername field, keeping just serverUrl.
        discourseServer: {serverUrl: "https://example.com"},
        // It should default to not using the Initiatives plugin.
        initiatives: null,
      });
    });
    it("should upgrade from 0.4.0 formatting", () => {
      // Given
      const body = {
        id: "example-040",
        repoIds: [foobar, foozod],
        discourseServer: {
          serverUrl: "https://example.com",
        },
        identities: [],
      };
      const compat = toCompat(
        {type: "sourcecred/project", version: "0.4.0"},
        body
      );

      // When
      const project = projectFromJSON(compat);

      // Then
      expect(project).toEqual({
        ...body,
        // It should default to not using the Initiatives plugin.
        initiatives: null,
      });
    });
  });
  describe("encodeProjectId", () => {
    it("is a base64-url encoded id", () => {
      const project = {id: "foo bar", repoIds: []};
      const encoded = encodeProjectId(project.id);
      expect(encoded).toEqual(base64url.encode("foo bar"));
    });
    it("is decodable to identity", () => {
      expect(base64url.decode(encodeProjectId("foo bar"))).toEqual("foo bar");
    });
  });
  describe("createProject", () => {
    it("requires an id field", () => {
      // Given
      const projectShape = {};

      // When
      const fn = () => createProject(projectShape);

      // Then
      expect(fn).toThrow("Project.id must be set");
    });
    it("adds default values", () => {
      // Given
      const projectShape = {
        id: "minimal-project",
      };

      // When
      const project = createProject(projectShape);

      // Then
      // Note: adding Project type annotation to force all fields are used.
      const expectedProject: Project = {
        id: projectShape.id,
        discourseServer: null,
        repoIds: [],
        identities: [],
        initiatives: null,
      };
      expect(project).toEqual(expectedProject);
    });
    it("treats input shape as overrides", () => {
      // Given
      // Note: adding Project type annotation to force all fields are used.
      const projectShape: Project = {
        id: "@foo",
        repoIds: [foobar, foozod],
        discourseServer: {serverUrl: "https://example.com"},
        identities: [
          {
            username: "example",
            aliases: ["github/example"],
          },
        ],
        initiatives: {
          discourseCategoryId: 12,
          topicBlacklist: [666],
        },
      };

      // When
      const project = createProject(projectShape);

      // Then
      expect(project).toEqual(projectShape);
    });
  });
});
