// @flow

import {GithubReferenceDetector} from "./references";
import {NodeAddress} from "../../core/graph";

describe("plugins/initiatives/references", () => {
  describe("GithubReferenceDetector", () => {
    it("should support issue URLs", () => {
      // Given
      const refs = new GithubReferenceDetector();
      const url = "https://github.com/sourcecred/sourcecred/issues/1420";

      // When
      const addr = refs.addressFromUrl(url);

      // Then
      expect(addr ? NodeAddress.toParts(addr) : null).toMatchInlineSnapshot(`
        Array [
          "sourcecred",
          "github",
          "ISSUE",
          "sourcecred",
          "sourcecred",
          "1420",
        ]
      `);
    });

    it("should support PR URLs", () => {
      // Given
      const refs = new GithubReferenceDetector();
      const url = "https://github.com/sourcecred/sourcecred/pull/1404";

      // When
      const addr = refs.addressFromUrl(url);

      // Then
      expect(addr ? NodeAddress.toParts(addr) : null).toMatchInlineSnapshot(`
        Array [
          "sourcecred",
          "github",
          "PULL",
          "sourcecred",
          "sourcecred",
          "1404",
        ]
      `);
    });
  });
});
