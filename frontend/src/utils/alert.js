import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const popupBase = {
  background: "rgba(20,20,40,0.6)",
  backdrop: `
      rgba(0,0,0,0.55)
      blur(6px)
    `,
  color: "#e0e7ff",
  customClass: {
    popup: "neon-popup",
    title: "neon-title",
  }
};

// SUCCESS
export const alertSuccess = (title, text = "") => {
  return Swal.fire({
    ...popupBase,
    icon: "success",
    title,
    text,
    confirmButtonColor: "#00f7ff",
  });
};

// ERROR
export const alertError = (title, text = "") => {
  return Swal.fire({
    ...popupBase,
    icon: "error",
    title,
    text,
    confirmButtonColor: "#ff0066",
  });
};

// CONFIRM DIALOG
export const alertConfirm = (title, text = "") => {
  return Swal.fire({
    ...popupBase,
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonText: "Yes",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#00f7ff",
    cancelButtonColor: "#666",
  });
};