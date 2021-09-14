import { describe, expect, test, jest, beforeEach } from "@jest/globals";
import UploadHandler from "../../src/uploadHandle.js";
import TestUtil from "../_util/testUtil.js";
import fs from "fs";
import { resolve } from "path";
import { pipeline } from "stream/promises";
import { logger } from "../../src/logger.js";

describe("UploadHandler suit", () => {
  const io = {
    to: (id) => io,
    emit: (event, message) => {},
  };

  beforeEach(() => {
    jest.spyOn(logger, "info").mockImplementation();
  });

  describe("RegisterEvents", () => {
    test("should call onFile and onFinish on busboy instance", () => {
      const uploadHandler = new UploadHandler({ io, socketId: "01" });

      jest.spyOn(uploadHandler, uploadHandler.onFile.name).mockResolvedValue();

      const headers = {
        "content-type": "multipart/form-data; boundary=",
      };

      const onFinish = jest.fn();
      const busboy = uploadHandler.registerEvents(headers, onFinish);

      const fileStream = TestUtil.generateReadableStream([
        "chunk",
        "of",
        "data",
      ]);

      busboy.emit("file", "fieldname", fileStream, "filename.txt");
      busboy.listeners("finish")[0].call();
      expect(uploadHandler.onFile).toHaveBeenCalled();

      expect(onFinish).toHaveBeenCalled();
    });
  });

  describe("onFile", () => {
    test("given a stream file it should save it on disk", async () => {
      const chunks = ["hey", "my file"];
      const downloadsFolder = "/tmp";

      const handler = new UploadHandler({
        io,
        socketId: "01",
        downloadsFolder,
      });

      const onData = jest.fn();

      jest
        .spyOn(fs, fs.createWriteStream.name)
        .mockImplementation(() => TestUtil.generateWritableStream(onData));

      const onTransform = jest.fn();
      jest
        .spyOn(handler, handler.handleFileBuffer.name)
        .mockImplementation(() =>
          TestUtil.generateTransformStream(onTransform)
        );

      const params = {
        fieldName: "video",
        file: TestUtil.generateReadableStream(chunks),
        filename: "test.txt",
      };

      await handler.onFile(...Object.values(params));

      expect(onData.mock.calls.join()).toEqual(chunks.join());
      expect(onTransform.mock.calls.join()).toEqual(chunks.join());

      const expectedPath = resolve(handler.downloadsFolder, params.filename);
      expect(fs.createWriteStream).toHaveBeenCalledWith(expectedPath);
    });
  });

  describe("handleFileStream", () => {
    test("should call emit function and it is a transform stream", async () => {
      jest.spyOn(io, io.emit.name);
      jest.spyOn(io, io.to.name);

      const handler = new UploadHandler({ io, socketId: "01" });

      jest.spyOn(handler, handler.canExecute.name).mockReturnValue(true);

      const messages = ["hello"];
      const source = TestUtil.generateReadableStream(messages);
      const onWrite = jest.fn();
      const target = TestUtil.generateWritableStream(onWrite);

      await pipeline(source, handler.handleFileBuffer("filename.txt"), target);

      expect(io.to).toHaveBeenCalledTimes(messages.length);
      expect(io.emit).toHaveBeenCalledTimes(messages.length);

      expect(onWrite).toBeCalledTimes(messages.length);
      expect(onWrite.mock.calls.join()).toEqual(messages.join());
    });

    test("Given message to,erDelay as 2sec it should emit only on message during 3 seconds period", async () => {
      jest.spyOn(io, io.emit.name);
      jest.spyOn(io, io.to.name);

      const day = "2021-07-01 01:01";
      const onInitVariable = TestUtil.getTimeFromDate(`${day}:01`);

      const onFirstMessageCame = TestUtil.getTimeFromDate(`${day}:03`);
      const onFirstMessageExecuted = onFirstMessageCame;

      const onSecondMessageCame = TestUtil.getTimeFromDate(`${day}:04`);

      const onThirdMessageCame = TestUtil.getTimeFromDate(`${day}:05`);

      TestUtil.mockDateNow([
        onInitVariable,
        onFirstMessageCame,
        onFirstMessageExecuted,
        onSecondMessageCame,
        onThirdMessageCame,
      ]);

      const messageTimeDelay = 2000;
      const filename = "teste.txt";
      const messages = ["hello", "not you", "world"];

      const source = TestUtil.generateReadableStream(messages);
      const handler = new UploadHandler({
        io,
        socketId: "01",
        messageTimeDelay,
      });

      await pipeline(source, handler.handleFileBuffer(filename));

      expect(io.emit).toHaveBeenCalledTimes(2);

      const [firstCall, secondCall] = io.emit.mock.calls;

      expect(firstCall).toEqual([
        handler.ON_UPLOAD_EVENT,
        { processedAlready: messages[0].length, filename },
      ]);

      expect(secondCall).toEqual([
        handler.ON_UPLOAD_EVENT,
        { processedAlready: messages.join("").length, filename },
      ]);
    });
  });

  describe("CanExecute", () => {
    const uploadHandler = new UploadHandler({});

    test("should return true when time is later than specified delay", () => {
      const tickNow = TestUtil.getTimeFromDate("2021-07-01 00:00:03");
      const tickThreeSecondsBefore = TestUtil.getTimeFromDate(
        "2021-07-01 00:00:00"
      );

      const timerDelay = 1000;
      const uploadHandler = new UploadHandler({ messageTimeDelay: timerDelay });

      TestUtil.mockDateNow([tickNow]);
      const result = uploadHandler.canExecute(tickThreeSecondsBefore);
      expect(result).toBeTruthy();
    });

    test("should return false when time isnt later than specified delay", () => {
      const tickNow = TestUtil.getTimeFromDate("2021-07-01 00::00:03");
      const lastExecution = TestUtil.getTimeFromDate("2021-07-01 00:00:00");

      const timerDelay = 5000;
      const uploadHandler = new UploadHandler({ messageTimeDelay: timerDelay });

      TestUtil.mockDateNow([tickNow]);
      const result = uploadHandler.canExecute(lastExecution);
      expect(result).toBeFalsy();
    });
  });
});
