import mongoose from "mongoose";

const getIndianTime = () => {
  const istOffset =
    5.5 * 60 * 60 * 1000;

  return new Date(
    Date.now() + istOffset
  );
};

const bankAccountSchema =
  new mongoose.Schema(
    {
      userId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          "User",

        required:
          true,

        index:
          true,
      },

      accountHolderName: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      /*
       * Encrypted value.
       * Never plain account number.
       */
      accountNumberEncrypted: {
        type:
          String,

        required:
          true,

        select:
          false,
      },

      accountNumberLast4: {
        type:
          String,

        required:
          true,
      },

      ifscCode: {
        type:
          String,

        required:
          true,

        trim:
          true,

        uppercase:
          true,
      },

      bankName: {
        type:
          String,

        default:
          null,

        trim:
          true,
      },

      accountType: {
        type:
          String,

        enum: [
          "SAVINGS",
          "CURRENT",
        ],

        default:
          "SAVINGS",
      },

      verificationStatus: {
        type:
          String,

        enum: [
          "PENDING",
          "VERIFIED",
          "FAILED",
        ],

        default:
          "PENDING",
      },

      isPrimary: {
        type:
          Boolean,

        default:
          true,
      },
    },

    {
      timestamps: {
        currentTime:
          getIndianTime,
      },
    }
  );

export default mongoose.model(
  "BankAccount",
  bankAccountSchema
);