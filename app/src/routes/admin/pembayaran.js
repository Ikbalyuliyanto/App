import express from "express";
import prisma from "../../prisma.js";
import auth from "../../middleware/auth.js";
import adminOnly from "../../middleware/adminOnly.js";

const router = express.Router();

/**
 * GET /api/admin/pembayaran
 * List semua pembayaran
 */
router.get("/", auth, adminOnly, async (req, res) => {
  const data = await prisma.pembayaran.findMany({
    orderBy: { dibuatPada: "desc" },
    include: {
      pesanan: {
        include: {
          pengguna: {
            select: { id: true, email: true }
          }
        }
      }
    }
  });

  res.json(data);
});

/**
 * PATCH /api/admin/pembayaran/:id/berhasil
 * Konfirmasi pembayaran manual
 */
router.patch("/:id/berhasil", auth, adminOnly, async (req, res) => {
  const id = Number(req.params.id);

  const pembayaran = await prisma.pembayaran.findUnique({ where: { id } });
  if (!pembayaran) {
    return res.status(404).json({ message: "Pembayaran tidak ditemukan" });
  }

  if (pembayaran.status !== "MENUNGGU") {
    return res.status(400).json({ message: "Status tidak bisa diubah" });
  }

  await prisma.$transaction(async (tx) => {
    await tx.pembayaran.update({
      where: { id },
      data: {
        status: "BERHASIL",
        paidAt: new Date()
      }
    });

    await tx.pesanan.update({
      where: { id: pembayaran.pesananId },
      data: { status: "DIPROSES" }
    });
  });

  res.json({ message: "Pembayaran dikonfirmasi" });
});

export default router;
