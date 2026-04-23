import React from "react";

const team = [
  {
    name: "Sarah Chen",
    role: "Lead Developer",
    email: "sarah.chen@virtualfit.example",
    phone: "+1 (555) 123-4567"
  },
  {
    name: "Marcus Johnson",
    role: "Product Manager",
    email: "marcus.j@virtualfit.example",
    phone: "+1 (555) 987-6543"
  },
  {
    name: "Elena Rodriguez",
    role: "AI Research Scientist",
    email: "elena.r@virtualfit.example",
    phone: "+1 (555) 456-7890"
  }
];

export default function Contact() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-14 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Contact</h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Have questions about the Virtual Try-On system? Reach out to our team.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {team.map((m) => (
          <div
            key={m.email}
            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center"
          >
            <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold">
              {m.name.charAt(0)}
            </div>
            <div className="text-lg font-semibold text-slate-900">{m.name}</div>
            <div className="text-sm font-medium text-indigo-600 mb-5">{m.role}</div>

            <div className="space-y-3 text-sm">
              <a
                className="block text-slate-600 hover:text-indigo-600 transition-colors"
                href={`mailto:${m.email}`}
              >
                {m.email}
              </a>
              <a
                className="block text-slate-600 hover:text-indigo-600 transition-colors"
                href={`tel:${m.phone}`}
              >
                {m.phone}
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

