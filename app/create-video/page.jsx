"use client"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function CreateVideo() {
  const [videoTitle, setVideoTitle] = useState("")
  const [description, setDescription] = useState("")
  const [videoLink, setVideoLink] = useState("")
  const [skill, setSkill] = useState(1)
  const [OTT, setOTT] = useState(false)
  const [APP, setAPP] = useState(false)
  const [ARG, setARG] = useState(false)
  const [PUTT, setPUTT] = useState(false)
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
      video_link: videoLink,
      skill,
      OTT,
      APP,
      ARG,
      PUTT,
      watched_fully: false
    }]).select().single()

    if (error) {
      console.error(error)
      alert('Error creating video: ' + error.message)
      return
    }

    const videoId = video.id
    if (selectedSections.length > 0) {
      const relations = selectedSections.map(sectionId => ({ section_id: sectionId, video_id: videoId }))
      const { error: relError } = await supabase.from('section_videos').insert(relations)
      if (relError) {
        console.error('Error linking sections:', relError)
        alert('Video created but there was an error linking sections')
        return
      }
    }

    alert('Video created and linked to sections!')
    setVideoTitle("")
    setDescription("")
    setVideoLink("")
    setSkill(1)
    setOTT(false)
    setAPP(false)
    setARG(false)
    setPUTT(false)
    setSelectedSections([])
  }

  return (
    <form onSubmit={handleSubmit} className="p-8 text-white">
      <h1 className="text-2xl mb-4">Create Video</h1>
      <input className="block mb-2 p-2 text-black" placeholder="Video Title" value={videoTitle} onChange={e => setVideoTitle(e.target.value)} required />
      <textarea className="block mb-2 p-2 text-black" placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
      <input className="block mb-4 p-2 text-black" placeholder="Video Link" value={videoLink} onChange={e => setVideoLink(e.target.value)} required />

      <label className="block mb-2">Recommendation Level</label>
      <select className="block mb-4 p-2 text-black" value={skill} onChange={e => setSkill(parseInt(e.target.value))}>
        <option value={1}>Beginner</option>
        <option value={2}>Intermediate</option>
        <option value={3}>Advanced</option>
      </select>

      <div className="mb-4">
        <label className="flex items-center">
          <input type="checkbox" checked={OTT} onChange={() => setOTT(!OTT)} className="mr-2" />
          OTT (Off The Tee)
        </label>
        <label className="flex items-center">
          <input type="checkbox" checked={APP} onChange={() => setAPP(!APP)} className="mr-2" />
          APP (Approach)
        </label>
        <label className="flex items-center">
          <input type="checkbox" checked={ARG} onChange={() => setARG(!ARG)} className="mr-2" />
          ARG (Around Green)
        </label>
        <label className="flex items-center">
          <input type="checkbox" checked={PUTT} onChange={() => setPUTT(!PUTT)} className="mr-2" />
          PUTT (Putting)
        </label>
      </div>

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
