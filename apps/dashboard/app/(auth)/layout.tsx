import React from "react";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return <main className="auth font-montserrat">{children}</main>;
};

export default Layout;
