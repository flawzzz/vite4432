import { useEffect, useState } from "react";

export default function Character() {

    interface Character { // data api
        job: string;
        image: string;
        group: string;
    }

    const [data, setData] = useState<Character[] | null>(null);

    useEffect(() => {
        async function load() {
            const res = await fetch("/data/character.json");
            const json = await res.json();
            setData(json);
        }
        load();
    }, []);

    if (!data) return <p>loading...</p>;

    // data recieved 
    const grouped: { [key: string]: Character[] } = {};

    data.forEach(person => {
        const group = person.group;
        if (!grouped[group]) grouped[group] = [];
        grouped[group].push(person);
    });

    return (
        <>
            {
                Object.entries(grouped).map(([group, members]) => (
                    <div key={group} className="flex gap-4">
                        <div className="w-16">{group}</div>
                        <div className="flex flex-wrap gap-4">
                            {
                                Object.entries(members).map(([index, member]) => (
                                    <div key={index} className="w-22">
                                        <img src={`/images/character/${member.image}.PNG`} alt={member.job} />
                                        <p>{member.job}</p>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                ))
            }
        </>
    );
}
