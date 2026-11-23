import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SlotPicker } from "../components/SlotPicker";
import { api } from "../lib/api";

vi.mock("../lib/api", () => ({ api: { get: vi.fn() }, errMsg: (e: unknown) => String(e) }));
const props = { doctorId: 1, date: "2026-11-02", onDate: vi.fn(), slot: "", onSlot: vi.fn() };

describe("SlotPicker", () => {
  beforeEach(() => vi.clearAllMocks());
  it("lists the free slots the server returns and reports the chosen one", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { slots: [{ start: "2026-11-02T10:00:00", time: "10:00" }, { start: "2026-11-02T10:30:00", time: "10:30" }] } });
    render(<SlotPicker {...props} />);
    await userEvent.click(await screen.findByRole("radio", { name: "10:30" }));
    expect(props.onSlot).toHaveBeenCalledWith("2026-11-02T10:30:00");
    expect(api.get).toHaveBeenCalledWith("/doctors/1/availability", { params: { date: "2026-11-02" } });
  });
  it("explains when a day has no free slots", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { slots: [] } });
    render(<SlotPicker {...props} />);
    expect(await screen.findByText(/no free slots on this day/i)).toBeInTheDocument();
  });
});
