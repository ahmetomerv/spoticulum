import type { ComponentType } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { RouterProps } from "./types/navigation";

export const withRouter = <P extends RouterProps>(
  Component: ComponentType<P>,
): ComponentType<Omit<P, keyof RouterProps>> => {
  const Wrapper = (props: Omit<P, keyof RouterProps>) => {
    const navigate = useNavigate();
    const location = useLocation();
    const componentProps = {
      ...props,
      navigate,
      location: location as RouterProps["location"],
    } as P;

    return <Component {...componentProps} />;
  };

  return Wrapper;
};
