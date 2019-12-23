// @flow

import base64url from "base64url";
import {type RepoId} from "../core/repoId";
import {toCompat, fromCompat, type Compatible} from "../util/compat";
import {type Identity} from "../plugins/identity/identity";
import {type DiscourseServer} from "../plugins/discourse/loadDiscourse";
import {type InitiativeOptions} from "../plugins/initiatives/loadInitiatives";

export type ProjectId = string;

/**
 * A project represents a scope for cred analysis.
 *
 * Right now it has an `id` (which should be unique across a user's projects)
 * and an array of GitHub RepoIds.
 *
 * In the future, instead of hardcoding support for plugins like GitHub and Discourse,
 * we will have a generic system for storing plugin-specific config, keyed by plugin
 * identifier.
 *
 * We may add more fields (e.g. a description) to this object in the future.
 *
 * We may create a complimentary object with load/cache info for the project in
 * the future (e.g. showing the last update time for each of the project's data
 * dependencies).
 */
export type Project = {|
  +id: ProjectId,
  +repoIds: $ReadOnlyArray<RepoId>,
  +discourseServer: DiscourseServer | null,
  +identities: $ReadOnlyArray<Identity>,
  +initiatives: InitiativeOptions | null,
|};

const COMPAT_INFO = {type: "sourcecred/project", version: "0.5.0"};

const upgradeFrom030 = (p) =>
  upgradeFrom040({
    ...p,
    discourseServer:
      p.discourseServer != null
        ? {serverUrl: p.discourseServer.serverUrl}
        : null,
  });

const upgradeFrom040 = (p) => ({
  ...p,
  initiatives: null,
});

const upgrades = {
  "0.3.0": upgradeFrom030,
  "0.3.1": upgradeFrom030,
  "0.4.0": upgradeFrom040,
};

/**
 * Creates a new Project instance with default values.
 *
 * Note: the `id` field is required, as there's no sensible default.
 */
export function createProject(p: $Shape<Project>): Project {
  if (!p.id) {
    throw new Error("Project.id must be set");
  }

  return {
    repoIds: [],
    identities: [],
    discourseServer: null,
    initiatives: null,
    ...p,
  };
}

export function projectToJSON(p: Project): Compatible<Project> {
  return toCompat(COMPAT_INFO, p);
}

export function projectFromJSON(j: Compatible<any>): Project {
  return fromCompat(COMPAT_INFO, j, upgrades);
}

/**
 * Encode the project ID so it can be stored on the filesystem,
 * or retrieved via XHR from the frontend.
 */
export function encodeProjectId(id: ProjectId): string {
  return base64url.encode(id);
}
