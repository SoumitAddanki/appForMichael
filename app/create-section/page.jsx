"use client"
import { useState } from "react"
import { supabase } from "../../lib/supabase"

export default function CreateSection() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [skill, setSkill] = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('sections').insert([{ name, description, skill }])
    if (error) console.error(error)
    else alert('Section created!')
  }

  return (
    <form onSubmit={handleSubmit} className="p-8 text-white">
      <h1 className="text-2xl mb-4">Create Section</h1>
      <input className="block mb-2 p-2 text-black" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
      <input className="block mb-2 p-2 text-black" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
      <input className="block mb-4 p-2 text-black" placeholder="Skill" value={skill} onChange={e => setSkill(e.target.value)} />
      <button type="submit" className="bg-blue-600 px-4 py-2 rounded">Create Section</button>
    </form>
  )
}
