import { Outlet } from "react-router-dom";

export default function PageFrame() {
  return (
    <div className="flex flex-1 flex-col">
      <Outlet />
    </div>
  );
}
