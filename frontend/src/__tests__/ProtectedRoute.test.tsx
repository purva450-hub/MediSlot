import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Mock, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { useAuth } from "../lib/AuthContext";

vi.mock("../lib/AuthContext", () => ({ useAuth: vi.fn() }));

function renderAdminRoute(role: string | null) {
  (useAuth as Mock).mockReturnValue({ user: role ? { role } : null, loading: false });
  render(<MemoryRouter initialEntries={["/admin"]}><Routes>
    <Route element={<ProtectedRoute roles={["admin"]} />}><Route path="admin" element={<div>secret admin page</div>} /></Route>
    <Route path="login" element={<div>login page</div>} /></Routes></MemoryRouter>);
}

describe("ProtectedRoute", () => {
  it("sends anonymous visitors to login", () => { renderAdminRoute(null); expect(screen.getByText("login page")).toBeInTheDocument(); });
  it("blocks a patient from admin pages", () => { renderAdminRoute("patient"); expect(screen.getByText(/don't have access/i)).toBeInTheDocument(); expect(screen.queryByText("secret admin page")).toBeNull(); });
  it("lets an admin in", () => { renderAdminRoute("admin"); expect(screen.getByText("secret admin page")).toBeInTheDocument(); });
});
