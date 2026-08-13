/**
 * React study-tool launch card — same classes/markup as the HTML string helper.
 * Use this from React trees; legacy panels still call renderStudyToolLaunch().
 */
import { createElement as h } from "react";
import { renderStudyToolLaunch } from "./StudyToolLaunch.js";

export function StudyToolLaunch(props) {
  // Preserve exact legacy markup by hydrating the proven HTML string.
  return h("div", {
    className: "study-tool-launch-react-host",
    dangerouslySetInnerHTML: { __html: renderStudyToolLaunch(props) }
  });
}

export default StudyToolLaunch;
