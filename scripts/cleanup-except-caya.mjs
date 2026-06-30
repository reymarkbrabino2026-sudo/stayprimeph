#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { v2 as cloudinary } from "cloudinary";
import { del as deleteBlob } from "@vercel/blob";
import { PrismaClient } from "@prisma/client";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const immutableAuditLogActions = [
  "listing.approved",
  "listing.rejected",
  "payment.approved",
  "payment.rejected",
  "payment.refunded",
  "account.anonymized",
];

const jsonStoreFiles = [
  "users.json",
  "properties.json",
  "bookings.json",
  "payments.json",
  "messages.json",
  "reviews.json",
  "wishlists.json",
  "auth-tokens.json",
  "sessions.json",
  "passkeys.json",
  "account-settings.json",
  "availability-blocks.json",
  "cancellations.json",
  "payouts.json",
  "platform-ledger.json",
  "host-expenses.json",
  "host-monthly-reports.json",
  "host-customer-profiles.json",
  "reports.json",
  "admin-logs.json",
  "audit-logs.json",
];

function usage() {
  return `
Usage:
  node scripts/cleanup-except-caya.mjs [options]

Default mode is a dry run. To delete data, pass --execute and set:
  CLEANUP_CONFIRM=DELETE_NON_CAYA

Options:
  --match <text>             Text used to find Caya users/listings. Default: caya
  --keep-user-id <id>        User id to retain. Can be repeated.
  --keep-listing-id <id>     Listing/property id to retain. Can be repeated.
  --keep-admins              Retain all admin users.
  --keep-host-listings       Retain every listing owned by retained users.
  --store <auto|prisma|json> Data store to clean. Default: auto
  --env <file>               Load env vars from a file before connecting.
  --json-dir <dir>           JSON store directory. Default: data
  --skip-storage-cleanup     Do not delete Cloudinary/Vercel Blob/local photo files.
  --execute                  Actually delete records. Without this, prints a dry run.
  --help                     Show this help.
`.trim();
}

function parseArgs(argv) {
  const options = {
    match: "caya",
    keepUserIds: new Set(),
    keepListingIds: new Set(),
    keepAdmins: false,
    keepHostListings: false,
    store: "auto",
    envFiles: [],
    jsonDir: "data",
    execute: false,
    cleanupStorage: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}.`);
      index += 1;
      return value;
    };

    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    } else if (arg === "--match") {
      options.match = next();
    } else if (arg === "--keep-user-id") {
      options.keepUserIds.add(next());
    } else if (arg === "--keep-listing-id") {
      options.keepListingIds.add(next());
    } else if (arg === "--keep-admins") {
      options.keepAdmins = true;
    } else if (arg === "--keep-host-listings") {
      options.keepHostListings = true;
    } else if (arg === "--store") {
      options.store = next();
      if (!["auto", "prisma", "json"].includes(options.store)) throw new Error("--store must be auto, prisma, or json.");
    } else if (arg === "--env") {
      options.envFiles.push(next());
    } else if (arg === "--json-dir") {
      options.jsonDir = next();
    } else if (arg === "--skip-storage-cleanup") {
      options.cleanupStorage = false;
    } else if (arg === "--execute") {
      options.execute = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (!options.match.trim() && !options.keepUserIds.size && !options.keepListingIds.size) {
    throw new Error("Provide --match text or explicit ids to retain.");
  }

  return options;
}

function optionalEnv(value) {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "\"\"" || trimmed === "''") return undefined;
  return trimmed;
}

async function loadEnvFile(file) {
  const absolutePath = path.resolve(repoRoot, file);
  const text = await fs.readFile(absolutePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    let value = match[2].trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function getDatabaseUrl() {
  return optionalEnv(process.env.POSTGRES_PRISMA_URL)
    ?? optionalEnv(process.env.POSTGRES_URL)
    ?? optionalEnv(process.env.DATABASE_URL);
}

function selectedStore(options) {
  if (options.store !== "auto") return options.store;
  return getDatabaseUrl() && optionalEnv(process.env.PERSISTENCE_DRIVER) === "prisma" ? "prisma" : "json";
}

function textMatches(value, matcher) {
  return matcher ? String(value ?? "").toLowerCase().includes(matcher) : false;
}

function userMatches(user, matcher, options) {
  return options.keepUserIds.has(user.id)
    || textMatches(user.id, matcher)
    || textMatches(user.name, matcher)
    || textMatches(user.email, matcher);
}

function propertyMatches(property, matcher, options) {
  return options.keepListingIds.has(property.id)
    || textMatches(property.id, matcher)
    || textMatches(property.slug, matcher)
    || textMatches(property.title, matcher);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function isStoredPhotoUrl(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return Boolean(trimmed)
    && trimmed !== "pending-upload"
    && (trimmed.startsWith("/uploads/") || /^https?:\/\//i.test(trimmed));
}

function collectPropertyPhotoUrls(properties) {
  const urls = [];
  for (const property of properties) {
    for (const image of property.images ?? []) {
      if (isStoredPhotoUrl(image.imageUrl)) urls.push(image.imageUrl);
      if (isStoredPhotoUrl(image.url)) urls.push(image.url);
    }
    for (const room of property.rooms ?? []) {
      for (const url of room.photos ?? room.photoUrls ?? []) {
        if (isStoredPhotoUrl(url)) urls.push(url);
      }
    }
  }
  return urls;
}

function collectListingRoomPhotoUrls(rooms) {
  const urls = [];
  for (const room of rooms) {
    const photoUrls = Array.isArray(room.photoUrls) ? room.photoUrls : [];
    for (const url of photoUrls) {
      if (isStoredPhotoUrl(url)) urls.push(url);
    }
  }
  return urls;
}

function storageTargetFromPhotoUrl(value) {
  if (!isStoredPhotoUrl(value)) return null;
  if (value.startsWith("/uploads/")) return { storage: "local", id: value };

  try {
    const url = new URL(value);
    if (url.hostname.endsWith(".public.blob.vercel-storage.com")) {
      return { storage: "vercel-blob", id: value };
    }

    if (url.hostname === "res.cloudinary.com") {
      const parts = url.pathname.split("/").filter(Boolean);
      const [cloudName, resourceType, deliveryType, ...uploadParts] = parts;
      if (resourceType !== "image" || deliveryType !== "upload") return null;
      const configuredCloudName = optionalEnv(process.env.CLOUDINARY_CLOUD_NAME);
      if (configuredCloudName && configuredCloudName !== cloudName) return null;
      const versionIndex = uploadParts.findIndex((part) => /^v\d+$/.test(part));
      const publicPathParts = uploadParts.slice(versionIndex >= 0 ? versionIndex + 1 : 0);
      if (!publicPathParts.length) return null;
      return {
        storage: "cloudinary",
        id: publicPathParts.map((part) => decodeURIComponent(part)).join("/").replace(/\.[^/.]+$/, ""),
      };
    }
  } catch {
    return null;
  }

  return null;
}

function photoTargets(urls) {
  const byKey = new Map();
  for (const url of urls) {
    const target = storageTargetFromPhotoUrl(url);
    if (target) byKey.set(`${target.storage}:${target.id}`, target);
  }
  return [...byKey.values()];
}

async function cleanupPhotoTargets(targets) {
  const failures = [];
  const blobToken = optionalEnv(process.env.PHOTO_BLOB_READ_WRITE_TOKEN) ?? optionalEnv(process.env.BLOB_READ_WRITE_TOKEN);
  const cloudinaryConfig = {
    cloud_name: optionalEnv(process.env.CLOUDINARY_CLOUD_NAME),
    api_key: optionalEnv(process.env.CLOUDINARY_API_KEY),
    api_secret: optionalEnv(process.env.CLOUDINARY_API_SECRET),
    secure: true,
  };
  const hasCloudinaryConfig = Boolean(cloudinaryConfig.cloud_name && cloudinaryConfig.api_key && cloudinaryConfig.api_secret);
  if (hasCloudinaryConfig) cloudinary.config(cloudinaryConfig);

  for (const target of targets) {
    try {
      if (target.storage === "vercel-blob") {
        if (!blobToken) throw new Error("Missing PHOTO_BLOB_READ_WRITE_TOKEN or BLOB_READ_WRITE_TOKEN.");
        await deleteBlob(target.id, { token: blobToken });
      } else if (target.storage === "cloudinary") {
        if (!hasCloudinaryConfig) throw new Error("Missing Cloudinary cleanup credentials.");
        await cloudinary.uploader.destroy(target.id, { resource_type: "image", invalidate: true });
      } else if (target.storage === "local") {
        const uploadsRoot = path.resolve(repoRoot, "public", "uploads");
        const absolutePath = path.resolve(repoRoot, "public", target.id.startsWith("/") ? target.id.slice(1) : target.id);
        if (!absolutePath.startsWith(`${uploadsRoot}${path.sep}`)) {
          throw new Error("Refusing to delete a local file outside public/uploads.");
        }
        await fs.rm(absolutePath, { force: true });
      }
    } catch (error) {
      failures.push({ target, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return failures;
}

function deletionWhere(parts) {
  const present = parts.filter(Boolean);
  return present.length ? { OR: present } : null;
}

function idsWhere(field, ids) {
  return ids.length ? { [field]: { in: ids } } : null;
}

async function buildPrismaPlan(prisma, options) {
  const matcher = options.match.trim().toLowerCase();
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, avatar: true },
    orderBy: { createdAt: "desc" },
  });
  const properties = await prisma.property.findMany({
    select: { id: true, slug: true, title: true, hostId: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  const keepUserIds = new Set(users.filter((user) => userMatches(user, matcher, options)).map((user) => user.id));
  const keepPropertyIds = new Set(properties.filter((property) => propertyMatches(property, matcher, options)).map((property) => property.id));

  for (const property of properties) {
    if (keepPropertyIds.has(property.id)) keepUserIds.add(property.hostId);
  }
  if (options.keepHostListings) {
    for (const property of properties) {
      if (keepUserIds.has(property.hostId)) keepPropertyIds.add(property.id);
    }
  }
  if (options.keepAdmins) {
    for (const user of users) {
      if (user.role === "admin") keepUserIds.add(user.id);
    }
  }

  if (!keepUserIds.size && !keepPropertyIds.size) {
    throw new Error(`No users or listings matched "${options.match}". Refusing to delete everything.`);
  }

  const deleteUserIds = users.filter((user) => !keepUserIds.has(user.id)).map((user) => user.id);
  const deletePropertyIds = properties.filter((property) => !keepPropertyIds.has(property.id)).map((property) => property.id);
  const bookingWhere = deletionWhere([
    idsWhere("propertyId", deletePropertyIds),
    idsWhere("guestId", deleteUserIds),
    idsWhere("hostId", deleteUserIds),
  ]);
  const bookingsToDelete = bookingWhere
    ? await prisma.booking.findMany({ where: bookingWhere, select: { id: true } })
    : [];
  const deleteBookingIds = bookingsToDelete.map((booking) => booking.id);
  const paymentsToDelete = deleteBookingIds.length
    ? await prisma.payment.findMany({ where: { bookingId: { in: deleteBookingIds } }, select: { id: true, receiptImageUrl: true } })
    : [];
  const deletePaymentIds = paymentsToDelete.map((payment) => payment.id);
  const propertyImages = deletePropertyIds.length
    ? await prisma.propertyImage.findMany({ where: { propertyId: { in: deletePropertyIds } }, select: { imageUrl: true } })
    : [];
  const listingRooms = deletePropertyIds.length
    ? await prisma.listingRoom.findMany({ where: { propertyId: { in: deletePropertyIds } }, select: { photoUrls: true } })
    : [];
  const deletedUserAvatars = users
    .filter((user) => deleteUserIds.includes(user.id))
    .map((user) => user.avatar)
    .filter(isStoredPhotoUrl);
  const photoUrls = unique([
    ...propertyImages.map((image) => image.imageUrl),
    ...collectListingRoomPhotoUrls(listingRooms),
    ...paymentsToDelete.map((payment) => payment.receiptImageUrl).filter(isStoredPhotoUrl),
    ...deletedUserAvatars,
  ]);

  return {
    store: "prisma",
    keepUsers: users.filter((user) => keepUserIds.has(user.id)),
    keepProperties: properties.filter((property) => keepPropertyIds.has(property.id)),
    deleteUserIds,
    deletePropertyIds,
    deleteBookingIds,
    deletePaymentIds,
    photoUrls,
    photoTargets: photoTargets(photoUrls),
  };
}

async function executePrismaCleanup(prisma, plan) {
  const deleteUserIds = plan.deleteUserIds;
  const deletePropertyIds = plan.deletePropertyIds;
  const deleteBookingIds = plan.deleteBookingIds;
  const deletePaymentIds = plan.deletePaymentIds;

  await prisma.$transaction(async (tx) => {
    if (deleteBookingIds.length) await tx.bookingResourceLock.deleteMany({ where: { bookingId: { in: deleteBookingIds } } });
    if (deleteBookingIds.length) await tx.platformLedgerEntry.deleteMany({ where: { bookingId: { in: deleteBookingIds } } });
    if (deletePaymentIds.length || deleteBookingIds.length || deleteUserIds.length) {
      await tx.payout.deleteMany({
        where: deletionWhere([
          idsWhere("bookingId", deleteBookingIds),
          idsWhere("paymentId", deletePaymentIds),
          idsWhere("hostId", deleteUserIds),
        ]),
      });
    }
    if (deleteBookingIds.length) await tx.payment.deleteMany({ where: { bookingId: { in: deleteBookingIds } } });
    if (deleteBookingIds.length || deletePropertyIds.length) {
      await tx.cancellation.deleteMany({
        where: deletionWhere([
          idsWhere("bookingId", deleteBookingIds),
          idsWhere("propertyId", deletePropertyIds),
        ]),
      });
    }
    if (deleteUserIds.length || deleteBookingIds.length || deletePropertyIds.length) {
      await tx.message.deleteMany({
        where: deletionWhere([
          idsWhere("senderId", deleteUserIds),
          idsWhere("receiverId", deleteUserIds),
          idsWhere("bookingId", deleteBookingIds),
          idsWhere("propertyId", deletePropertyIds),
        ]),
      });
    }
    if (deleteUserIds.length || deletePropertyIds.length) {
      await tx.review.deleteMany({
        where: deletionWhere([
          idsWhere("guestId", deleteUserIds),
          idsWhere("propertyId", deletePropertyIds),
        ]),
      });
      await tx.wishlist.deleteMany({
        where: deletionWhere([
          idsWhere("userId", deleteUserIds),
          idsWhere("propertyId", deletePropertyIds),
        ]),
      });
      await tx.report.deleteMany({
        where: deletionWhere([
          idsWhere("reporterId", deleteUserIds),
          idsWhere("propertyId", deletePropertyIds),
        ]),
      });
    }
    if (deleteUserIds.length) {
      await tx.hostCustomerProfile.deleteMany({
        where: deletionWhere([
          idsWhere("hostId", deleteUserIds),
          idsWhere("guestId", deleteUserIds),
        ]),
      });
      await tx.hostExpense.deleteMany({ where: { hostId: { in: deleteUserIds } } });
      await tx.hostMonthlyReport.deleteMany({ where: { hostId: { in: deleteUserIds } } });
      await tx.adminLog.deleteMany({ where: { adminId: { in: deleteUserIds } } });
      await tx.authToken.deleteMany({ where: { userId: { in: deleteUserIds } } });
      await tx.authSession.deleteMany({ where: { userId: { in: deleteUserIds } } });
      await tx.passkey.deleteMany({ where: { userId: { in: deleteUserIds } } });
      await tx.accountSettings.deleteMany({ where: { userId: { in: deleteUserIds } } });
      await tx.hostProfile.deleteMany({ where: { userId: { in: deleteUserIds } } });
    }
    if (deleteUserIds.length || deletePropertyIds.length || deleteBookingIds.length) {
      await tx.auditLog.deleteMany({
        where: {
          action: { notIn: immutableAuditLogActions },
          OR: [
            ...deleteUserIds.map((id) => ({ actorId: id })),
            ...deleteUserIds.map((id) => ({ entityType: "user", entityId: id })),
            ...deletePropertyIds.map((id) => ({ entityType: "property", entityId: id })),
            ...deletePropertyIds.map((id) => ({ entityType: "listing", entityId: id })),
            ...deleteBookingIds.map((id) => ({ entityType: "booking", entityId: id })),
          ],
        },
      });
    }
    if (deleteBookingIds.length) await tx.booking.deleteMany({ where: { id: { in: deleteBookingIds } } });
    if (deletePropertyIds.length) await tx.property.deleteMany({ where: { id: { in: deletePropertyIds } } });
    if (deleteUserIds.length) await tx.user.deleteMany({ where: { id: { in: deleteUserIds } } });
    await tx.amenity.deleteMany({ where: { properties: { none: {} } } });
  }, { maxWait: 10000, timeout: 60000 });
}

async function readJsonArray(file) {
  try {
    const text = await fs.readFile(file, "utf8");
    return JSON.parse(text || "[]");
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

async function writeJsonArray(file, items) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(items, null, 2)}\n`);
}

async function buildJsonPlan(options) {
  const jsonDir = path.resolve(repoRoot, options.jsonDir);
  const stores = new Map();
  for (const fileName of jsonStoreFiles) {
    stores.set(fileName, await readJsonArray(path.join(jsonDir, fileName)));
  }

  const users = stores.get("users.json");
  const properties = stores.get("properties.json");
  const matcher = options.match.trim().toLowerCase();
  const keepUserIds = new Set(users.filter((user) => userMatches(user, matcher, options)).map((user) => user.id));
  const keepPropertyIds = new Set(properties.filter((property) => propertyMatches(property, matcher, options)).map((property) => property.id));

  for (const property of properties) {
    if (keepPropertyIds.has(property.id)) keepUserIds.add(property.hostId);
  }
  if (options.keepHostListings) {
    for (const property of properties) {
      if (keepUserIds.has(property.hostId)) keepPropertyIds.add(property.id);
    }
  }
  if (options.keepAdmins) {
    for (const user of users) {
      if (user.role === "admin") keepUserIds.add(user.id);
    }
  }

  if (!keepUserIds.size && !keepPropertyIds.size) {
    throw new Error(`No users or listings matched "${options.match}". Refusing to delete everything.`);
  }

  const deleteUserIds = users.filter((user) => !keepUserIds.has(user.id)).map((user) => user.id);
  const deletePropertyIds = properties.filter((property) => !keepPropertyIds.has(property.id)).map((property) => property.id);
  const deleteBookingIds = stores.get("bookings.json")
    .filter((booking) => deletePropertyIds.includes(booking.propertyId) || deleteUserIds.includes(booking.guestId) || deleteUserIds.includes(booking.hostId))
    .map((booking) => booking.id);
  const deletePaymentIds = stores.get("payments.json")
    .filter((payment) => deleteBookingIds.includes(payment.bookingId) || deleteUserIds.includes(payment.guestId) || deleteUserIds.includes(payment.hostId))
    .map((payment) => payment.id);
  const deletedProperties = properties.filter((property) => deletePropertyIds.includes(property.id));
  const deletedUsers = users.filter((user) => deleteUserIds.includes(user.id));
  const deletedPayments = stores.get("payments.json").filter((payment) => deletePaymentIds.includes(payment.id));
  const photoUrls = unique([
    ...collectPropertyPhotoUrls(deletedProperties),
    ...deletedPayments.map((payment) => payment.receiptImageUrl).filter(isStoredPhotoUrl),
    ...deletedUsers.map((user) => user.avatar).filter(isStoredPhotoUrl),
  ]);

  return {
    store: "json",
    jsonDir,
    stores,
    keepUsers: users.filter((user) => keepUserIds.has(user.id)),
    keepProperties: properties.filter((property) => keepPropertyIds.has(property.id)),
    deleteUserIds,
    deletePropertyIds,
    deleteBookingIds,
    deletePaymentIds,
    photoUrls,
    photoTargets: photoTargets(photoUrls),
  };
}

function filterStore(fileName, items, plan) {
  const deleteUsers = new Set(plan.deleteUserIds);
  const deleteProperties = new Set(plan.deletePropertyIds);
  const deleteBookings = new Set(plan.deleteBookingIds);
  const deletePayments = new Set(plan.deletePaymentIds);

  if (fileName === "users.json") return items.filter((item) => !deleteUsers.has(item.id));
  if (fileName === "properties.json") return items.filter((item) => !deleteProperties.has(item.id));
  if (fileName === "bookings.json") return items.filter((item) => !deleteBookings.has(item.id));
  if (fileName === "payments.json") return items.filter((item) => !deletePayments.has(item.id));
  if (fileName === "messages.json") {
    return items.filter((item) => !deleteUsers.has(item.senderId) && !deleteUsers.has(item.receiverId) && !deleteBookings.has(item.bookingId) && !deleteProperties.has(item.propertyId));
  }
  if (fileName === "reviews.json") return items.filter((item) => !deleteUsers.has(item.guestId) && !deleteProperties.has(item.propertyId));
  if (fileName === "wishlists.json") return items.filter((item) => !deleteUsers.has(item.userId) && !deleteProperties.has(item.propertyId));
  if (fileName === "auth-tokens.json" || fileName === "sessions.json" || fileName === "passkeys.json" || fileName === "account-settings.json") {
    return items.filter((item) => !deleteUsers.has(item.userId));
  }
  if (fileName === "availability-blocks.json") return items.filter((item) => !deleteProperties.has(item.propertyId));
  if (fileName === "cancellations.json") return items.filter((item) => !deleteBookings.has(item.bookingId) && !deleteProperties.has(item.propertyId));
  if (fileName === "payouts.json") return items.filter((item) => !deleteUsers.has(item.hostId) && !deleteBookings.has(item.bookingId) && !deletePayments.has(item.paymentId));
  if (fileName === "platform-ledger.json") return items.filter((item) => !deleteBookings.has(item.bookingId) && !deletePayments.has(item.paymentId));
  if (fileName === "host-expenses.json" || fileName === "host-monthly-reports.json") return items.filter((item) => !deleteUsers.has(item.hostId));
  if (fileName === "host-customer-profiles.json") return items.filter((item) => !deleteUsers.has(item.hostId) && !deleteUsers.has(item.guestId));
  if (fileName === "reports.json") return items.filter((item) => !deleteUsers.has(item.reporterId) && !deleteProperties.has(item.propertyId));
  if (fileName === "admin-logs.json") return items.filter((item) => !deleteUsers.has(item.adminId));
  if (fileName === "audit-logs.json") {
    return items.filter((item) => {
      if (immutableAuditLogActions.includes(item.action)) return true;
      if (deleteUsers.has(item.actorId)) return false;
      if ((item.entityType === "user" || item.entityType === "account") && deleteUsers.has(item.entityId)) return false;
      if ((item.entityType === "property" || item.entityType === "listing") && deleteProperties.has(item.entityId)) return false;
      if (item.entityType === "booking" && deleteBookings.has(item.entityId)) return false;
      return true;
    });
  }
  return items;
}

async function executeJsonCleanup(plan) {
  for (const [fileName, items] of plan.stores.entries()) {
    const nextItems = filterStore(fileName, items, plan);
    if (nextItems.length !== items.length) {
      await writeJsonArray(path.join(plan.jsonDir, fileName), nextItems);
    }
  }
}

function summary(plan) {
  return {
    mode: plan.store,
    retained: {
      users: plan.keepUsers.map((user) => ({ id: user.id, name: user.name, role: user.role })),
      listings: plan.keepProperties.map((property) => ({ id: property.id, title: property.title, hostId: property.hostId })),
    },
    deleting: {
      users: plan.deleteUserIds.length,
      listings: plan.deletePropertyIds.length,
      bookings: plan.deleteBookingIds.length,
      payments: plan.deletePaymentIds.length,
      photoUrls: plan.photoUrls.length,
      storageTargets: plan.photoTargets.length,
    },
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  for (const file of options.envFiles) await loadEnvFile(file);

  const store = selectedStore(options);
  let prisma;

  try {
    let plan;

    if (store === "prisma") {
      const databaseUrl = getDatabaseUrl();
      if (!databaseUrl) throw new Error("No DATABASE_URL/POSTGRES_PRISMA_URL/POSTGRES_URL is configured.");
      process.env.DATABASE_URL = databaseUrl;
      process.env.DIRECT_URL = optionalEnv(process.env.DIRECT_URL) ?? databaseUrl;
      prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
      plan = await buildPrismaPlan(prisma, options);
    } else {
      plan = await buildJsonPlan(options);
    }

    console.log(JSON.stringify(summary(plan), null, 2));

    if (!options.execute) {
      console.log("\nDry run only. Add --execute and CLEANUP_CONFIRM=DELETE_NON_CAYA to delete these records.");
      return;
    }

    if (process.env.CLEANUP_CONFIRM !== "DELETE_NON_CAYA") {
      throw new Error("Set CLEANUP_CONFIRM=DELETE_NON_CAYA before using --execute.");
    }

    if (store === "prisma") {
      await executePrismaCleanup(prisma, plan);
    } else {
      await executeJsonCleanup(plan);
    }

    let storageFailures = [];
    if (options.cleanupStorage && plan.photoTargets.length) {
      storageFailures = await cleanupPhotoTargets(plan.photoTargets);
    }

    console.log(JSON.stringify({
      deleted: true,
      records: summary(plan).deleting,
      storage: {
        attempted: options.cleanupStorage,
        targets: plan.photoTargets.length,
        failures: storageFailures,
      },
    }, null, 2));
  } finally {
    await prisma?.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
