import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Login } from "../pages/Auth";

const login = vi.fn();
vi.mock("../lib/AuthContext", () => ({ useAuth: () => ({ login }) }));

describe("Login form", () => {
  it("shows validation messages and does not call the API when empty", async () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    await userEvent.click(screen.getByRole("button", { name: /^log in$/i }));
    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });
});
