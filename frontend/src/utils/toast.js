import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

export const toast = (icon, title) => {
  Swal.fire({
    toast: true,
    icon,
    title,
    position: "top-end",
    showConfirmButton: false,
    timer: 2000,
    timerProgressBar: true,
    background: "rgba(20,20,20,0.8)",
    color: "#fff",
  });
};

export const successToast = (msg) => toast("success", msg);
export const errorToast = (msg) => toast("error", msg);