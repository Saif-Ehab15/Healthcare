import React from "react";
import styles from "./AdminHome.module.css";

export default function AdminHome() {
  const features = [
    {
      icon: "👩‍⚕️",
      title: "Staff Management",
      description:
        "Manage doctors, nurses, and medical staff with detailed profiles and roles.",
    },
    {
      icon: "🏥",
      title: "Department Control",
      description:
        "Organize and manage hospital departments for efficient healthcare delivery.",
    },
    {
      icon: "📊",
      title: "Analytics Dashboard",
      description:
        "Monitor hospital performance with real-time data and visual analytics.",
    },
    {
      icon: "🔐",
      title: "Admin Security",
      description:
        "Control access and permissions for hospital administrators and staff.",
    },
  ];

  return (
    <div className={styles.adminHome}>
      <div className={styles.welcomeSection}>
        <h1 className={styles.welcomeTitle}>🏥 Hospital Admin Panel</h1>
        <p className={styles.welcomeSubtitle}>
          Streamline your hospital management with our advanced tools.  
          Manage staff, departments, and monitor performance — all from one place.
        </p>
      </div>

      <div className={styles.featuresContainer}>
        <div className={styles.featuresGrid}>
          {features.map((feature, index) => (
            <div key={index} className={styles.featureCard}>
              <div className={styles.featureIcon}>{feature.icon}</div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDescription}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
