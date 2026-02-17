import React from "react";

export default function Dashboard() {
  console.log("Dashboard rendered");
  return (
    <div className="max-w-4xl p-8 mx-auto">
      <h1 className="text-3xl font-bold">Astraea — Dashboard</h1>
      <p className="mt-4 text-gray-600">Welcome to the Astraea dashboard.</p>
    </div>
  );
}
