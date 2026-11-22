// How every notification type looks. No imports from the app, so nothing can loop.
// One place that decides how every notification type looks.
export const KINDS = {
  new_order: { icon: "bag", tone: "gold", title: "New paid order" },
  new_delivery_job: { icon: "bike", tone: "gold", title: "New delivery job" },
  delivery_accepted: { icon: "bike", tone: "gold", title: "Rider accepted" },
  delivery_picked_up: { icon: "package", tone: "blue", title: "Package picked up" },
  delivery_at_door: { icon: "door", tone: "amber", title: "Package at the door" },
  delivery_otp_ready: { icon: "shield", tone: "amber", title: "Your delivery code is ready" },
  delivery_completed: { icon: "check", tone: "green", title: "Delivery confirmed" },
  sale_completed: { icon: "check", tone: "green", title: "Sale complete" },
  delivery_cancelled_by_rider: { icon: "alert", tone: "red", title: "Rider cancelled" },
}
export const kindOf = type => KINDS[type] || { icon: "bell", tone: "gold", title: "Update" }
