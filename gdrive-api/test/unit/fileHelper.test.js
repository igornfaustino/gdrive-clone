import { describe, expect, test, jest } from "@jest/globals";
import fs from "fs/promises";
import FileHelper from "../../src/fileHelper.js";

describe("FileHelper suite test", () => {
  describe("getFilesStatus", () => {
    const statMock = {
      dev: 2052,
      mode: 33204,
      nlink: 1,
      uid: 1000,
      gid: 1000,
      rdev: 0,
      blksize: 4096,
      ino: 435529,
      size: 189453,
      blocks: 376,
      atimeMs: 1629906474469.7273,
      mtimeMs: 1629906474525.727,
      ctimeMs: 1631112712416.1152,
      birthtimeMs: 1629906474469.7273,
      atime: "2021-08-25T15:47:54.470Z",
      mtime: "2021-08-25T15:47:54.526Z",
      ctime: "2021-09-08T14:51:52.416Z",
      birthtime: "2021-08-25T15:47:54.470Z",
    };

    test("it should return files statuses in correct format", async () => {
      const mockUser = "igornfaustino";
      process.env.USER = mockUser;
      const filename = "test.pdf";

      jest.spyOn(fs, fs.readdir.name).mockResolvedValue([filename]);
      jest.spyOn(fs, fs.stat.name).mockResolvedValue(statMock);

      const result = await FileHelper.getFilesStatus("/tmp");

      const expectedResult = [
        {
          owner: mockUser,
          file: filename,
          size: "189 kB",
          lastModified: statMock.birthtime,
        },
      ];

      expect(fs.stat).toHaveBeenCalledWith(`/tmp/${filename}`);
      expect(result).toMatchObject(expectedResult);
    });
  });
});
