ALTER TABLE "Message" DROP CONSTRAINT "Message_bookingId_fkey";

ALTER TABLE "Message" ALTER COLUMN "bookingId" DROP NOT NULL;
ALTER TABLE "Message" ADD COLUMN "propertyId" TEXT;

ALTER TABLE "Message" ADD CONSTRAINT "Message_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Message_bookingId_idx" ON "Message"("bookingId");
CREATE INDEX "Message_propertyId_idx" ON "Message"("propertyId");
CREATE INDEX "Message_senderId_receiverId_idx" ON "Message"("senderId", "receiverId");
