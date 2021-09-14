import {
  describe,
  expect,
  test,
  jest,
  afterAll,
  beforeAll,
} from "@jest/globals";
import Routes from "../../src/routes.js";
import fs from "fs";
import FormData from "form-data";
import TestUtil from "../_util/testUtil.js";
import { logger } from "../../src/logger.js";
import { tmpdir } from "os";
import { join } from "path";

describe("Routes integration test", () => {
  const io = {
    to: (id) => io,
    emit: (event, message) => {},
  };

  let defaultDownloadFolder = "";

  beforeAll(async () => {
    defaultDownloadFolder = await fs.promises.mkdtemp(
      join(tmpdir(), "downloads-")
    );
  });

  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation();
  });

  afterAll(async () => {
    await fs.promises.rm(defaultDownloadFolder, { recursive: true });
  });

  test("get file status", async () => {
    const filename = "funny.mp4";
    const fileStream = fs.createReadStream(
      `./test/integration/mocks/${filename}`
    );
    const response = TestUtil.generateWritableStream(() => {});

    const form = new FormData();
    form.append("video", fileStream);

    const params = {
      request: Object.assign(form, {
        headers: form.getHeaders(),
        method: "POST",
        url: "?socketId=10",
      }),
      response: {
        setHeader: jest.fn(),
        writeHead: jest.fn(),
        end: jest.fn(),
      },
      values: () => Object.values(params),
    };

    const routes = new Routes(defaultDownloadFolder);
    routes.setSocketInstance(io);

    const initialDir = await fs.promises.readdir(defaultDownloadFolder);
    expect(initialDir).toEqual([]);

    await routes.handler(...params.values());

    const dirAfterRun = await fs.promises.readdir(defaultDownloadFolder);
    expect(dirAfterRun).toEqual([filename]);

    expect(params.response.writeHead).toHaveBeenCalledWith(200);
    expect(params.response.end).toHaveBeenCalledWith(
      JSON.stringify({ result: "Files uploaded with success!" })
    );
  });
});
