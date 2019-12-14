// @flow

import {Graph} from "../../core/graph";
import {TaskReporter} from "../../util/taskReporter";
import type {CategoryId, TopicId} from "../discourse/fetch";
import {createGraph, type ReferenceDetector} from "./createGraph";
import {
  type DiscourseQueries,
  DiscourseInitiativeRepository,
} from "./discourse";

export type InitiativeOptions = {|
  /**
   * The Discourse category from which to parse Topics as Initiatives.
   */
  +discourseCategoryId: CategoryId,

  /**
   * Topics that should be skipped for Initiative parsing if encountered.
   *
   * Useful mainly for ignoring Topics in the initiatives category that
   * we know are not intended as an Initiative. Such as the "about" topic,
   * or perhaps a discussion / announcement topics surrounding initiatives.
   */
  +topicBlacklist: $ReadOnlyArray<TopicId>,
|};

export type InitiativeLoadOptions = {|
  ...InitiativeOptions,
  +serverUrl: string,
  +queries: DiscourseQueries,
|};

// Placeholder reference detector that does nothing.
// When the load system is changed, this can be removed.
export const noopReferenceDetector: ReferenceDetector = {
  addressFromUrl: (_) => null,
};

const TASK_NAME = "initiatives";
export async function loadInitiatives(
  options: InitiativeLoadOptions,
  reporter: TaskReporter
): Promise<Graph> {
  reporter.start(TASK_NAME);

  const {serverUrl, queries, discourseCategoryId, topicBlacklist} = options;
  const repo = new DiscourseInitiativeRepository({
    serverUrl,
    queries,
    initiativesCategory: discourseCategoryId,
    topicBlacklist,
  });

  const graph = createGraph(repo, noopReferenceDetector);

  reporter.finish(TASK_NAME);
  return graph;
}
