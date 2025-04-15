"use client"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function CreateVideo() {
  const [videoTitle, setVideoTitle] = useState("")
  const [description, setDescription] = useState("")
  const [duration, setDuration] = useState("")
  const [videoLink, setVideoLink] = useState("")
  const [sections, setSections] = useState([])
  const [selectedSections, setSelectedSections] = useState([])

  useEffect(() => {
    const fetchSections = async () => {
      const { data, error } = await supabase.from('sections').select('*')
      if (error) console.error(error)
      else setSections(data)
    }
    fetchSections()
  }, [])

  const handleCheckboxChange = (id) => {
    setSelectedSections(prev =>
      prev.includes(id) ? prev.filter(sectionId => sectionId !== id) : [...prev, id]
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const { data: video, error } = await supabase.from('videos').insert([{
      video_title: videoTitle,
      description,
      duration,
      video_link: videoLink
    }]).select().single()

    if (error) {
      console.error(error)
      return
    }

    const videoId = video.id
    const relations = selectedSections.map(sectionId => ({ section_id: sectionId, video_id: videoId }))
    await supabase.from('section_videos').insert(relations)

    alert('Video created and linked to sections!')
  }

  return (
    <form onSubmit={handleSubmit} className="p-8 text-white">
      <h1 className="text-2xl mb-4">Create Video</h1>
      <input className="block mb-2 p-2 text-black" placeholder="Video Title" value={videoTitle} onChange={e => setVideoTitle(e.target.value)} />
      <input className="block mb-2 p-2 text-black" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
      <input className="block mb-2 p-2 text-black" placeholder="Duration (ex: 00:05:00)" value={duration} onChange={e => setDuration(e.target.value)} />
      <input className="block mb-4 p-2 text-black" placeholder="Video Link" value={videoLink} onChange={e => setVideoLink(e.target.value)} />

      <h2 className="mb-2">Assign to Sections:</h2>
      {sections.map(section => (
        <label key={section.id} className="block mb-1">
          <input
            type="checkbox"
            checked={selectedSections.includes(section.id)}
            onChange={() => handleCheckboxChange(section.id)}
          />{" "}
          {section.name}
        </label>
      ))}

      <button type="submit" className="bg-green-600 px-4 py-2 rounded mt-4">Create Video</button>
    </form>
  )
}
