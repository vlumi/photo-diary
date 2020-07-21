import React from "react";
import PropTypes from "prop-types";

const Toggleable = React.forwardRef((props, ref) => {
  const [visible, setVisible] = React.useState(props.visibleDefault || false);

  const hideWhenVisible = { display: visible ? "none" : "" };
  const showWhenVisible = { display: visible ? "" : "none" };

  const toggle = () => setVisible(!visible);

  React.useImperativeHandle(ref, () => {
    return { toggle };
  });

  return (
    <>
      <span style={hideWhenVisible}>
        {props.defaultBody}
        <button onClick={toggle}>{props.showLabel || "Show"}</button>
      </span>
      <span style={showWhenVisible}>
        {props.children}
        <button onClick={toggle}>{props.hideLabel || "Hide"}</button>
      </span>
    </>
  );
});
Toggleable.displayName = "Toggleable";
Toggleable.propTypes = {
  defaultBody: PropTypes.string,
  showLabel: PropTypes.string,
  hideLabel: PropTypes.string,
};
export default Toggleable;
