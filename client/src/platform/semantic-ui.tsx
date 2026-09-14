/**
 * Compatibility boundary for the Semantic UI surface used by Spoticulum.
 * Vite maps the old import here so domain components and Semantic CSS stay intact.
 */
import {
  cloneElement,
  createElement,
  type ComponentType,
  type CSSProperties,
  type ElementType,
  type FormEventHandler,
  type HTMLAttributes,
  type ImgHTMLAttributes,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tooltip from "@radix-ui/react-tooltip";

const classes = (...values: Array<string | false | null | undefined>): string =>
  values.filter(Boolean).join(" ");

type SemanticElementProps = PropsWithChildren<{
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  [key: string]: unknown;
}>;
type SemanticComponent = ComponentType<SemanticElementProps>;

function element(
  defaultTag: ElementType,
  base: string,
  flags: readonly string[] = [],
): SemanticComponent {
  return function SemanticElement({
    as,
    className,
    children,
    ...incomingProps
  }: SemanticElementProps) {
    const props = { ...incomingProps };
    const modifiers: string[] = [];
    for (const flag of flags) {
      const value = props[flag];
      if (value)
        modifiers.push(value === true ? flag : `${String(value)} ${flag}`);
      delete props[flag];
    }
    return createElement(
      as ?? defaultTag,
      {
        ...props,
        className: classes(
          base.startsWith("ui ") && "ui",
          ...modifiers,
          base.replace(/^ui /, ""),
          className,
        ),
      },
      children,
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

type GridComponent = SemanticComponent & {
  Row: SemanticComponent;
  Column: SemanticComponent;
};
export const Grid = Object.assign(
  element("div", "ui grid", ["inverted", "stackable", "divided"]),
  {
    Row: element("div", "row"),
    Column: element("div", "column"),
  },
) as GridComponent;

type FormProps = SemanticElementProps & {
  onSubmit?: FormEventHandler<HTMLFormElement>;
};
type FormComponent = ComponentType<FormProps> & {
  Field: SemanticComponent;
  Group: SemanticComponent;
};
const FormRoot = ({ className, onSubmit, children, ...props }: FormProps) => (
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
export const Form = Object.assign(FormRoot, {
  Field: element("div", "field"),
  Group: element("div", "fields"),
}) as FormComponent;

interface ButtonProps extends SemanticElementProps {
  basic?: boolean;
  loading?: boolean;
  positive?: boolean;
  negative?: boolean;
  disabled?: boolean;
}
export function Button({
  as,
  basic,
  loading,
  positive,
  negative,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return createElement(
    as ?? "button",
    {
      ...props,
      disabled,
      className: classes(
        "ui",
        basic && "basic",
        loading && "loading",
        positive && "positive",
        negative && "negative",
        disabled && "disabled",
        "button",
        className,
      ),
    },
    children,
  );
}

interface IconProps extends HTMLAttributes<HTMLElement> {
  name: string;
  link?: boolean;
}
export function Icon({ name, link, className, ...props }: IconProps) {
  return (
    <i
      {...props}
      aria-hidden="true"
      className={classes(name, link && "link", "icon", className)}
    />
  );
}

interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  wrapped?: boolean;
  size?: string;
  bordered?: boolean;
  avatar?: boolean;
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
}: ImageProps) {
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

export function Dimmer({
  active,
  inverted,
  children,
}: PropsWithChildren<{ active?: boolean; inverted?: boolean }>) {
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

export function Loader({
  size,
  inverted,
  content,
}: {
  size?: string;
  inverted?: boolean;
  content?: string;
}) {
  return (
    <div
      role="status"
      aria-label={content || "Loading"}
      className={classes(
        "ui",
        size,
        inverted && "inverted",
        Boolean(content) && "text",
        "loader",
      )}
    >
      {content}
    </div>
  );
}

interface TriggerProps {
  tabIndex?: number;
  href?: string;
  role?: string;
  "aria-label"?: string;
}
export function Popup({
  trigger,
  content,
  size,
  on: _on,
}: {
  trigger: ReactElement<TriggerProps>;
  content: ReactNode;
  size?: string;
  on?: string;
}) {
  const label = typeof content === "string" ? content : undefined;
  const triggerElement = cloneElement(trigger, {
    tabIndex: trigger.props.tabIndex ?? 0,
    ...(trigger.type === "a" && !trigger.props.href
      ? { role: "button", "aria-label": label }
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

export function Modal({
  open,
  onOpen,
  onClose,
  children,
}: PropsWithChildren<{
  open: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}>) {
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

export function ModalHeader({ children }: PropsWithChildren) {
  return (
    <Dialog.Title asChild>
      <div className="header">{children}</div>
    </Dialog.Title>
  );
}

export function ModalContent({
  image,
  className,
  children,
  ...props
}: PropsWithChildren<HTMLAttributes<HTMLDivElement> & { image?: boolean }>) {
  return (
    <div {...props} className={classes(image && "image", "content", className)}>
      {children}
    </div>
  );
}

export const ModalActions = element("div", "actions");
