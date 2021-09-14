import { describe, expect, test, jest } from "@jest/globals";
import { logger } from "../../src/logger.js";
import Routes from "../../src/routes.js";
import UploadHandler from "../../src/uploadHandle.js";
import TestUtil from "../_util/testUtil.js";

describe("Routes suite test", () => {
  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation();
  });

  const request = TestUtil.generateReadableStream(["some file bytes"]);
  const response = TestUtil.generateWritableStream(() => {});
  const defaultParams = {
    request: Object.assign(request, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      method: "",
      body: {},
    }),
    response: Object.assign(response, {
      setHeader: jest.fn(),
      writeHead: jest.fn(),
      end: jest.fn(),
    }),
    values: () => Object.values(defaultParams),
  };

  describe("setSocketInstance", () => {
    test("setSocket should store io instance", () => {
      const routes = new Routes();
      const io = {
        to: (id) => io,
        emit: (event, message) => {},
      };

      routes.setSocketInstance(io);
      expect(routes.io).toStrictEqual(io);
    });
  });

  describe("handler", () => {
    test("given an inexistent route it should chose the default route", async () => {
      const routes = new Routes();
      const params = { ...defaultParams };

      params.request.method = "inexistent";
      await routes.handler(...params.values());

      expect(params.response.writeHead).toHaveBeenCalledWith(404);
      expect(params.response.end).toHaveBeenCalledWith();
    });

    test("it should set any request with CORS enabled", async () => {
      const routes = new Routes();
      const params = { ...defaultParams };

      params.request.method = "inexistent";
      await routes.handler(...params.values());

      expect(params.response.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "*"
      );
    });

    test("given method OPTIONS it should choose options method", async () => {
      const routes = new Routes();
      const params = { ...defaultParams };

      params.request.method = "OPTIONS";
      await routes.handler(...params.values());

      expect(params.response.writeHead).toHaveBeenCalledWith(204);
      expect(params.response.end).toHaveBeenCalledWith();
    });

    test("given method GET it should choose get method", async () => {
      const routes = new Routes();
      const params = { ...defaultParams };

      params.request.method = "GET";
      jest.spyOn(routes, routes.get.name).mockResolvedValue();

      await routes.handler(...params.values());

      expect(routes.get).toHaveBeenCalled();
    });

    test("given method POST it should choose post method", async () => {
      const routes = new Routes();
      const params = { ...defaultParams };

      params.request.method = "POST";
      jest.spyOn(routes, routes.post.name).mockResolvedValue();

      await routes.handler(...params.values());

      expect(routes.post).toHaveBeenCalled();
    });
  });

  describe("get", () => {
    const filesStatusesMock = {
      size: 189453,
      blocks: 376,
      birthtime: "2021-08-25T15:47:54.470Z",
      owner: "test",
      file: "file.png",
    };

    test("should list all downloaded files", async () => {
      const routes = new Routes();
      const params = { ...defaultParams };

      const filesStatusesMock = [
        {
          owner: "test",
          file: "filename.pdf",
          size: "189 kB",
          lastModified: "2021-08-25T15:47:54.470Z",
        },
      ];

      jest
        .spyOn(routes.fileHelper, routes.fileHelper.getFilesStatus.name)
        .mockResolvedValue(filesStatusesMock);

      params.request.method = "GET";

      await routes.handler(...params.values());

      expect(params.response.writeHead).toHaveBeenCalledWith(200);
      expect(params.response.end).toHaveBeenCalledWith(
        JSON.stringify(filesStatusesMock)
      );
    });
  });

  describe("post", () => {
    test("it should validade post workflow", async () => {
      const routes = new Routes("/tmp");
      const params = { ...defaultParams };
      params.request.method = "POST";
      params.request.url = "?socketId=10";

      jest
        .spyOn(
          UploadHandler.prototype,
          UploadHandler.prototype.registerEvents.name
        )
        .mockImplementation((headers, onFinish) => {
          const writable = TestUtil.generateWritableStream(() => {});
          writable.on("finish", onFinish);

          return writable;
        });

      await routes.handler(...params.values());

      expect(UploadHandler.prototype.registerEvents).toHaveBeenCalled();
      expect(params.response.writeHead).toHaveBeenCalledWith(200);
      expect(params.response.end).toHaveBeenCalledWith(
        JSON.stringify({ result: "Files uploaded with success!" })
      );
    });
  });
});
