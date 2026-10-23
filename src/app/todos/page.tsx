import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { Suspense } from "react";

async function TodosList() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: todos } = await supabase.from("todos").select();

  return (
    <ul className="p-8 space-y-2">
      {todos?.map((todo: any) => (
        <li key={todo.id}>{todo.name}</li>
      ))}
    </ul>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-[#627267]">Loading todos...</div>}>
      <TodosList />
    </Suspense>
  );
}
