import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthObject } from "@clerk/express";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import { ObjectPermission } from "../lib/objectAcl";
import { getOrCreateUser } from "./users";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload.
 * The client sends JSON metadata (name, size, contentType) — NOT the file.
 * Then uploads the file directly to the returned presigned URL.
 */
router.post("/storage/uploads/request-url", requireAuth(), async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  try {
    const { fileName, size, contentType } = parsed.data;

    const uploadUrl = await objectStorageService.getObjectEntityUploadURL();
    const objectPath = objectStorageService.normalizeObjectEntityPath(uploadUrl);

    return res.json(
      RequestUploadUrlResponse.parse({
        uploadUrl,
        objectPath,
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    return res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * POST /storage/uploads/confirm
 *
 * After a direct presigned PUT upload completes, the client calls this
 * endpoint to set owner ACL metadata on the object so it can be read back.
 */
router.post("/storage/uploads/confirm", requireAuth(), async (req: Request, res: Response) => {
  const { objectPath } = req.body as { objectPath?: string };
  if (!objectPath || typeof objectPath !== "string") {
    return res.status(400).json({ error: "objectPath is required" });
    return;
  }

  try {
    const auth = (req as any).auth as any;
    if (!auth?.userId) {
      return res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const user = await getOrCreateUser(auth.userId, `${auth.userId}@clerk.user`);

    await objectStorageService.trySetObjectEntityAclPolicy(objectPath, {
      owner: auth.userId,
      visibility: "private",
    });

    return res.json({ objectPath });
  } catch (error) {
    req.log.error({ err: error }, "Error confirming upload ACL");
    return res.status(500).json({ error: "Failed to confirm upload" });
  }
});

/**
 * GET /storage/public-objects/*
 *
 * Serve public assets from PUBLIC_OBJECT_SEARCH_PATHS.
 * These are unconditionally public — no authentication or ACL checks.
 * IMPORTANT: Always provide this endpoint when object storage is set up.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await objectStorageService.searchPublicObject(filePath);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await objectStorageService.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
    return;
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    return res.status(500).json({ error: "Failed to serve public object" });
  }
});

/**
 * GET /storage/objects/*
 *
 * Serve object entities from PRIVATE_OBJECT_DIR.
 * These are served from a separate path from /public-objects and can optionally
 * be protected with authentication or ACL checks based on the use case.
 */
router.get("/storage/objects/*path", requireAuth(), async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);

    const auth = (req as any).auth as any | undefined;
    if (!auth?.userId) {
      return res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const user = await getOrCreateUser(auth.userId, `${auth.userId}@clerk.user`);
    const canAccess = await objectStorageService.canAccessObjectEntity({
      userId: auth.userId,
      objectFile,
      requestedPermission: ObjectPermission.READ,
    });
    if (!canAccess) {
      return res.status(403).json({ error: "Forbidden" });
      return;
    }

    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
    return;
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      return res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    return res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
