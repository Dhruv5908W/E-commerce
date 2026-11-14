import Razorpay from "razorpay";

let razorpayClient = null;

const getRazorpayClient = () => {
  if (razorpayClient) return razorpayClient;

  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error("Razorpay credentials are not configured in environment variables");
  }

  razorpayClient = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });
  return razorpayClient;
};

export default getRazorpayClient;
