import Order from "../model/OrderModel.js";
import Asset from "../model/coAssetModel.js";

export const releaseExpiredReservations =
  async () => {
    try {
      const expiredOrders =
        await Order.find({
          status: "PENDING_PAYMENT",
          expiresAt: {
            $lte: new Date(),
          },
        });
        console.log("Expired orders found: ", expiredOrders.length);

      for (const order of expiredOrders){

        await Asset.findByIdAndUpdate(
          order.assetId,
          {
            $inc: {
              availableFractions:
                order.fractions,

              reservedFractions:
                -order.fractions,
            },
          }
        );
        order.status = "EXPIRED";
        await order.save();
        console.log(
          `Released reservation for order ${order._id}`
        );
      }

    } catch (error) {
      console.log(error);
    }
  };