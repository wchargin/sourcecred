// @flow

import type {URL} from "./initiative";
import type {ReferenceDetector} from "./createGraph";
import {NodeAddress, type NodeAddressT} from "../../core/graph";
import {githubOwnerPattern, githubRepoPattern} from "../../core/repoId";
import type {ReadRepository} from "../discourse/mirrorRepository";
import {topicAddress, userAddress, postAddress} from "../discourse/address";
import {linksToReferences} from "../discourse/references";

// TODO: this should probably be in the core, when universal reference detection is added.
export class CascadingReferenceDetector implements ReferenceDetector {
  refs: $ReadOnlyArray<ReferenceDetector>;

  constructor(refs: $ReadOnlyArray<ReferenceDetector>) {
    this.refs = refs;
  }

  addressFromUrl(url: URL): ?NodeAddressT {
    for (const ref of this.refs) {
      const addr = ref.addressFromUrl(url);
      if (addr) {
        return addr;
      }
    }
  }
}

const urlRegex = new RegExp(
  `^https?://github.com/(${githubOwnerPattern})/(${githubRepoPattern})/(issues|pull)/(\\d+)`
);

// TODO: this is a temporary implementation that needs replacing.
export class GithubReferenceDetector implements ReferenceDetector {
  addressFromUrl(url: URL): ?NodeAddressT {
    const mathes = urlRegex.exec(url);
    if (!mathes) {
      return null;
    }

    const [_, owner, repo, type, number] = mathes;
    return NodeAddress.fromParts([
      "sourcecred",
      "github",
      type === "issues" ? "ISSUE" : "PULL",
      owner,
      repo,
      number,
    ]);
  }
}

// TODO: this is a temporary implementation that needs replacing.
export class DiscourseReferenceDetector implements ReferenceDetector {
  data: ReadRepository;

  constructor(data: ReadRepository) {
    this.data = data;
  }

  addressFromUrl(url: URL): ?NodeAddressT {
    let dst: NodeAddressT | null = null;
    const [reference] = linksToReferences([url]);
    if (!reference) {
      return null;
    }

    switch (reference.type) {
      case "TOPIC": {
        dst = topicAddress(reference.serverUrl, reference.topicId);
        break;
      }
      case "POST": {
        const referredPostId = this.data.findPostInTopic(
          reference.topicId,
          reference.postIndex
        );
        if (referredPostId == null) {
          // Maybe a bad link, or the post or topic was deleted.
          return null;
        }
        dst = postAddress(reference.serverUrl, referredPostId);
        break;
      }
      case "USER": {
        dst = userAddress(reference.serverUrl, reference.username);
        break;
      }
      default: {
        throw new Error(
          `Unexpected reference type: ${(reference.type: empty)}`
        );
      }
    }

    return dst;
  }
}
