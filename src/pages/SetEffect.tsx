import { useEffect, useState } from "react";

export default function SetEffect() {

    interface SetEffect { // data api
        name: string;
        prefix: string;
        set_effect: string;
        type: string;
        image: string;
    }

    const [data, setData] = useState<SetEffect[] | null>(null);

    useEffect(() => {
        async function load() {
            const res = await fetch("/data/set.json");
            const json = await res.json();
            setData(json);
        }
        load();
    }, []);

    if (!data) return <p>loading...</p>;

    // data recieved 

    const grouped: { [key: string]: SetEffect[] } = {};

    data.forEach(person => {
        const group = person.name;
        if (!grouped[group]) grouped[group] = [];
        grouped[group].push(person);
    });

    return (
        <>
            {
                Object.entries(grouped).map(([index, member]) => (
                    <div key={index} className="w-22">
                        <img src={`/images/set/${member[0].image}.PNG`} alt={member[0].image} />
                        <p>{member[0].name}</p>
                    </div>
                ))
            }
        </>
    );
}
