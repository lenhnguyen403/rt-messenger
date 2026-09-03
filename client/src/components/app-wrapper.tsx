import React from "react";
import AsideBar from "./aside-bar";

interface Props {
  children: React.ReactNode;
}

const AppWrapper = ({ children }: Props) => {
  return (
    <div className="min-h-svh">
      <AsideBar />
      <main className="lg:pl-10 min-h-svh h-full">{children}</main>
    </div>
  );
};

export default AppWrapper;
