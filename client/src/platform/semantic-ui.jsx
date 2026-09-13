/**
 * Compatibility boundary for the Semantic UI surface used by Spoticulum.
 * Vite maps the old import here so domain components and Semantic CSS stay intact.
 * Interactive primitives use Radix's supported React 19 refs and focus handling.
 * This is intentionally not a general replacement for semantic-ui-react.
 */
import { cloneElement } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";

const classes = (...values) => values.filter(Boolean).join(" ");

function element(defaultTag, base, flags = []) {
  return function SemanticElement({
    as: Tag = defaultTag,
    className,
    children,
    ...props
  }) {
    const modifiers = [];
    for (const flag of flags) {
      if (props[flag])
        modifiers.push(props[flag] === true ? flag : `${props[flag]} ${flag}`);
      delete props[flag];
    }
    return (
      <Tag
        {...props}
        className={classes(
          base.startsWith("ui ") && "ui",
          ...modifiers,
          base.replace(/^ui /, ""),
          className,
        )}
      >
        {children}
      </Tag>
    );
  };
}

export const Container = element("div", "ui container");
export const Segment = element("div", "ui segment", ["vertical", "attached"]);
export const Header = element("div", "ui header", [
  "inverted",
  "block",
  "attached",
]);
export const Divider = element("div", "ui divider");
export const Grid = element("div", "ui grid", [
  "inverted",
  "stackable",
  "divided",
]);
Grid.Row = element("div", "row");
Grid.Column = element("div", "column");
export function Form({ className, onSubmit, children, ...props }) {
  return (
    <form
      {...props}
      className={classes("ui form", className)}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(event);
      }}
    >
      {children}
    </form>
  );
}
Form.Field = element("div", "field");
Form.Group = element("div", "fields");

export function Button({
  as: Tag = "button",
  basic,
  loading,
  positive,
  negative,
  disabled,
  className,
  children,
  ...props
}) {
  return (
    <Tag
      {...props}
      disabled={disabled}
      className={classes(
        "ui",
        basic && "basic",
        loading && "loading",
        positive && "positive",
        negative && "negative",
        disabled && "disabled",
        "button",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function Icon({ name, link, className, ...props }) {
  return (
    <i
      {...props}
      aria-hidden="true"
      className={classes(name, link && "link", "icon", className)}
    />
  );
}

export function Image({
  wrapped,
  size,
  bordered,
  avatar,
  className,
  src,
  alt = "",
  ...props
}) {
  const imageClass = classes(
    "ui",
    size,
    avatar && "avatar",
    bordered && "bordered",
    "image",
    className,
  );
  return wrapped ? (
    <div className={imageClass}>
      <img {...props} src={src} alt={alt} />
    </div>
  ) : (
    <img {...props} src={src} alt={alt} className={imageClass} />
  );
}

export function Dimmer({ active, inverted, children }) {
  return (
    <div
      className={classes(
        "ui",
        active && "active transition visible",
        inverted && "inverted",
        "dimmer",
      )}
    >
      <div className="content">{children}</div>
    </div>
  );
}

export function Loader({ size, inverted, content }) {
  return (
    <div
      role="status"
      aria-label={content || "Loading"}
      className={classes(
        "ui",
        size,
        inverted && "inverted",
        content && "text",
        "loader",
      )}
    >
      {content}
    </div>
  );
}

export function Popup({ trigger, content, size, on: _on }) {
  // The legacy footer supplies an anchor with no href. Make that trigger
  // keyboard accessible without editing the application component.
  const triggerElement = cloneElement(trigger, {
    tabIndex: trigger.props.tabIndex ?? 0,
    ...(trigger.type === "a" && !trigger.props.href
      ? { role: "button", "aria-label": content }
      : {}),
  });
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{triggerElement}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            side="top"
            sideOffset={8}
            className={classes(
              "ui",
              size,
              "popup top center transition visible",
            )}
            style={{
              display: "block",
              position: "relative",
              inset: "auto",
              zIndex: 2000,
            }}
          >
            {content}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

export function Modal({ open, onOpen, onClose, children }) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => (next ? onOpen?.() : onClose?.())}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className="ui dimmer modals page transition visible active"
          style={{ display: "flex", overflowY: "auto", padding: "2rem 0" }}
        >
          <Dialog.Content
            aria-describedby={undefined}
            className="ui modal transition visible active"
            style={{
              display: "block",
              position: "relative",
              margin: "auto",
              flexShrink: 0,
            }}
          >
            {children}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ModalHeader({ children }) {
  return (
    <Dialog.Title asChild>
      <div className="header">{children}</div>
    </Dialog.Title>
  );
}
export function ModalContent({ image, className, children, ...props }) {
  return (
    <div
      {...props}
      className={classes(image && "image", "content", className)}
    >
      {children}
    </div>
  );
}
export const ModalActions = element("div", "actions");
